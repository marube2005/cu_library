import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        extra_fields.setdefault('status', User.Status.APPROVED)
        extra_fields.setdefault('email_verified', True)

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        MEMBER = 'MEMBER', 'CU Member'
        ASSISTANT = 'ASSISTANT', 'Literature Ministry Assistant'
        LIBRARIAN = 'LIBRARIAN', 'Librarian'
        ADMIN = 'ADMIN', 'System Admin'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        INACTIVE = 'INACTIVE', 'Inactive'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone_whatsapp = models.CharField(max_length=20, help_text='Phone number with country code, e.g. +2547XXXXXXXX')
    reg_no = models.CharField(max_length=50, unique=True, null=True, blank=True, help_text='Student Registration or ID Number')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    whatsapp_consent = models.BooleanField(default=True, help_text='Consent to receive reminders on WhatsApp')
    
    # Email verification via OTP (sent via Brevo SMTP)
    email_verified = models.BooleanField(default=False, help_text='True once member verifies via OTP')
    otp_code = models.CharField(max_length=6, blank=True, default='', help_text='6-digit OTP for email verification')
    otp_expires_at = models.DateTimeField(null=True, blank=True, help_text='OTP expiry time (10 minutes from dispatch)')
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.reg_no or self.email}) - {self.get_role_display()}"

    @property
    def is_library_staff(self):
        return self.role in [self.Role.ASSISTANT, self.Role.LIBRARIAN, self.Role.ADMIN]

    @property
    def is_librarian_or_admin(self):
        return self.role in [self.Role.LIBRARIAN, self.Role.ADMIN]
