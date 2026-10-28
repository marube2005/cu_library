from django.urls import path
from .views import (
    IssueBookView, ReturnBookView, RenewLoanView,
    LoanListView, MyLoansView, ReservationListCreateView,
    RequestOrReserveView, RunMaintenanceView
)

urlpatterns = [
    path('loans/', LoanListView.as_view(), name='loan_list'),
    path('my-loans/', MyLoansView.as_view(), name='my_loans'),
    path('issue/', IssueBookView.as_view(), name='issue_book'),
    path('return/', ReturnBookView.as_view(), name='return_book'),
    path('loans/<uuid:pk>/renew/', RenewLoanView.as_view(), name='renew_loan'),
    path('reservations/', ReservationListCreateView.as_view(), name='reservations'),
    path('request-hold/', RequestOrReserveView.as_view(), name='request_or_reserve'),
    path('run-maintenance/', RunMaintenanceView.as_view(), name='run_maintenance'),
]

