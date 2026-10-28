from django.urls import path
from .views import DashboardStatsView, SystemSettingListView, SystemSettingDetailView, AuditLogListView

urlpatterns = [
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('settings/', SystemSettingListView.as_view(), name='system_settings'),
    path('settings/<str:pk>/', SystemSettingDetailView.as_view(), name='system_setting_detail'),
    path('audit-logs/', AuditLogListView.as_view(), name='audit_logs'),
]
