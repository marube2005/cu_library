from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, VerifyOTPView, ResendVerificationView,
    CurrentUserView, MemberListView, MemberStatusUpdateView, QuickAddMemberView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('members/', MemberListView.as_view(), name='members_list'),
    path('members/quick-add/', QuickAddMemberView.as_view(), name='members_quick_add'),
    path('members/<uuid:pk>/status/', MemberStatusUpdateView.as_view(), name='member_status_update'),
]

