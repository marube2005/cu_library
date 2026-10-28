from django.urls import path
from .views import FineListView, MyFinesView, RecordPaymentView, WaiveFineView

urlpatterns = [
    path('fines/', FineListView.as_view(), name='fine_list'),
    path('my-fines/', MyFinesView.as_view(), name='my_fines'),
    path('fines/<uuid:pk>/payments/', RecordPaymentView.as_view(), name='record_payment'),
    path('fines/<uuid:pk>/waive/', WaiveFineView.as_view(), name='waive_fine'),
]
