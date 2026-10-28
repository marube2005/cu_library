from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.accounts.urls')),
    path('api/v1/catalogue/', include('apps.catalogue.urls')),
    path('api/v1/circulation/', include('apps.circulation.urls')),
    path('api/v1/', include('apps.fines.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/reports/', include('apps.reports_audit.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
