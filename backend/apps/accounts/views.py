import random
from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer, UserRegistrationSerializer, MemberStatusUpdateSerializer,
    CustomTokenObtainPairSerializer, VerifyOTPSerializer, ResendVerificationSerializer,
    QuickAddMemberSerializer
)
from .brevo_service import send_otp_email

User = get_user_model()


class LoginView(TokenObtainPairView):
    """
    JWT login endpoint with email verification check.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'message': 'Registration successful! A 6-digit verification code has been sent to your email. Please enter it to activate your account.',
            'email': user.email,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class VerifyOTPView(APIView):
    """
    Verifies user email using the 6-digit OTP code sent via Brevo SMTP.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip()
        otp = serializer.validated_data['otp'].strip()

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {'detail': 'No account found with this email address.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.email_verified:
            return Response({'success': True, 'message': 'Email already verified. You can log in.'})

        if not user.otp_code or user.otp_code != otp:
            return Response(
                {'detail': 'Incorrect OTP code. Please check your email and try again.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.otp_expires_at and timezone.now() > user.otp_expires_at:
            return Response(
                {'detail': 'This OTP has expired. Please request a new code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.email_verified = True
        user.otp_code = ''
        user.otp_expires_at = None
        user.save()

        return Response({
            'success': True,
            'message': 'Email verified successfully! You may now log in to the CU Library System.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class ResendVerificationView(APIView):
    """
    Generates a fresh 6-digit OTP and resends it via Brevo SMTP.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip()

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            # Prevent email enumeration
            return Response({'message': 'If this email is registered, a new 6-digit code was sent.'})

        if user.email_verified:
            return Response({'message': 'This email is already verified. You can log in directly.'})

        # Generate fresh OTP
        new_otp = f"{random.randint(0, 999999):06d}"
        user.otp_code = new_otp
        user.otp_expires_at = timezone.now() + timedelta(minutes=10)
        user.email_verification_sent_at = timezone.now()
        user.save()

        send_otp_email(user, new_otp)
        return Response({'message': 'A fresh 6-digit verification code has been sent to your email.'})


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class MemberListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_library_staff:
            return User.objects.none()

        queryset = User.objects.all().order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                full_name__icontains=search
            ) | queryset.filter(
                reg_no__icontains=search
            ) | queryset.filter(
                email__icontains=search
            )

        return queryset


class MemberStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_librarian_or_admin:
            return Response({'detail': 'Only the Librarian or Admin can change membership status.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            member = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = MemberStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member.status = serializer.validated_data['status']
        member.save()

        return Response(UserSerializer(member).data)


class QuickAddMemberView(APIView):
    """
    Allows library staff to register a walk-in member on the spot at the circulation desk.
    Automatically sets status to APPROVED and email_verified to True.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_library_staff:
            return Response({'detail': 'Only library staff can register members on the spot.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = QuickAddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = serializer.save()
        return Response({
            'message': f'Member {member.full_name} registered and approved successfully.',
            'member': UserSerializer(member).data
        }, status=status.HTTP_201_CREATED)
