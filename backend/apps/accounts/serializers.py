import random
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .brevo_service import send_otp_email

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT login serializer that enforces email confirmation before login.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.email_verified:
            raise serializers.ValidationError(
                {'detail': 'Please confirm your email before logging in. Enter the 6-digit OTP sent to your inbox.'}
            )
        if self.user.status == User.Status.PENDING:
            raise serializers.ValidationError(
                {'detail': 'Your registration is pending approval by the Librarian. You will be able to log in once your membership is approved.'}
            )
        if self.user.status == User.Status.SUSPENDED:
            raise serializers.ValidationError(
                {'detail': 'Your library account is currently suspended. Please visit the circulation desk.'}
            )
        if self.user.status == User.Status.INACTIVE:
            raise serializers.ValidationError(
                {'detail': 'Your library account is inactive. Please contact the library administrator.'}
            )
        data['user'] = {
            'id': str(self.user.id),
            'email': self.user.email,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'status': self.user.status,
            'reg_no': self.user.reg_no,
            'email_verified': self.user.email_verified
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'phone_whatsapp', 'reg_no',
            'role', 'status', 'whatsapp_consent', 'email_verified', 'created_at'
        ]
        read_only_fields = ['id', 'role', 'status', 'email_verified', 'created_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'password', 'full_name', 'phone_whatsapp',
            'reg_no', 'whatsapp_consent'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        # Generate a 6-digit OTP
        otp = f"{random.randint(0, 999999):06d}"
        otp_expires = timezone.now() + timedelta(minutes=10)

        user = User.objects.create_user(
            role=User.Role.MEMBER,
            status=User.Status.PENDING,
            email_verified=False,
            otp_code=otp,
            otp_expires_at=otp_expires,
            email_verification_sent_at=timezone.now(),
            **validated_data
        )
        user.set_password(password)
        user.save()

        # Send OTP email via Brevo SMTP
        send_otp_email(user, otp)
        return user


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, min_length=6, max_length=6)


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class MemberStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=User.Status.choices)


class QuickAddMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name', 'email', 'phone_whatsapp', 'reg_no']

    def create(self, validated_data):
        import uuid
        user = User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            phone_whatsapp=validated_data.get('phone_whatsapp', ''),
            reg_no=validated_data.get('reg_no', ''),
            status=User.Status.APPROVED,
            email_verified=True,
            role=User.Role.MEMBER
        )
        # Set a random temporary password (member sets password via email link)
        user.set_password(str(uuid.uuid4()))
        user.save()
        return user

