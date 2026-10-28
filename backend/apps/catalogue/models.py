import uuid
from django.db import models
from django.conf import settings


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default='')

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Title(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, db_index=True)
    author = models.CharField(max_length=255, db_index=True)
    isbn = models.CharField(max_length=30, blank=True, null=True, db_index=True)
    publisher = models.CharField(max_length=255, blank=True, default='')
    publication_year = models.PositiveIntegerField(null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='titles')
    language = models.CharField(max_length=50, default='English')
    description = models.TextField(blank=True, default='')
    cover_image = models.ImageField(upload_to='covers/', blank=True, null=True)
    cover_url = models.URLField(max_length=500, blank=True, default='')
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return f"{self.title} by {self.author}"

    @property
    def total_copies_count(self):
        return self.copies.exclude(status=Copy.Status.WITHDRAWN).count()

    @property
    def available_copies_count(self):
        return self.copies.filter(status=Copy.Status.AVAILABLE).count()


class Copy(models.Model):
    class Condition(models.TextChoices):
        NEW = 'NEW', 'Brand New'
        GOOD = 'GOOD', 'Good'
        FAIR = 'FAIR', 'Fair'
        POOR = 'POOR', 'Poor'
        DAMAGED = 'DAMAGED', 'Damaged'

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available on Shelf'
        BORROWED = 'BORROWED', 'Borrowed'
        RESERVED = 'RESERVED', 'Reserved (On Hold)'
        LOST = 'LOST', 'Reported Lost'
        DAMAGED = 'DAMAGED', 'Under Repair / Damaged'
        WITHDRAWN = 'WITHDRAWN', 'Withdrawn from Circulation'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.ForeignKey(Title, on_delete=models.CASCADE, related_name='copies')
    copy_code = models.CharField(max_length=50, unique=True, db_index=True, help_text='e.g. CU-0001, CU-0002')
    shelf_location = models.CharField(max_length=100, blank=True, default='', help_text='e.g. Shelf B-2')
    condition = models.CharField(max_length=20, choices=Condition.choices, default=Condition.GOOD)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    replacement_cost = models.DecimalField(max_digits=10, decimal_places=2, default=800.00)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Copies'
        ordering = ['copy_code']

    def __str__(self):
        return f"{self.copy_code} - {self.title.title} ({self.get_status_display()})"


class BookRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Review'
        APPROVED = 'APPROVED', 'Approved for Purchase'
        REJECTED = 'REJECTED', 'Rejected'
        BOUGHT = 'BOUGHT', 'Acquired & Added to Library'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='book_suggestions')
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    note = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Suggestion: {self.title} by {self.member.full_name}"
