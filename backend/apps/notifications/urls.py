from django.urls import path
from .views import MessageTemplateListUpdateView, MessageLogListView, GenerateReminderView

urlpatterns = [
    path('templates/', MessageTemplateListUpdateView.as_view(), name='message_templates'),
    path('history/', MessageLogListView.as_view(), name='message_history'),
    path('generate-reminder/', GenerateReminderView.as_view(), name='generate_reminder'),
]
