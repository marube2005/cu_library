from django.urls import path
from .views import (
    CategoryListCreateView, TitleListView, TitleDetailView,
    CopyListCreateView, CopyDetailView, ISBNLookupView,
    MissingCoversListView, BulkImportView, BookRequestListCreateView
)

urlpatterns = [
    path('categories/', CategoryListCreateView.as_view(), name='category_list_create'),
    path('titles/', TitleListView.as_view(), name='title_list_create'),
    path('titles/<uuid:pk>/', TitleDetailView.as_view(), name='title_detail'),
    path('titles/missing-covers/', MissingCoversListView.as_view(), name='missing_covers'),
    path('isbn-lookup/', ISBNLookupView.as_view(), name='isbn_lookup'),
    path('bulk-import/', BulkImportView.as_view(), name='bulk_import'),
    path('copies/', CopyListCreateView.as_view(), name='copy_list_create'),
    path('copies/<uuid:pk>/', CopyDetailView.as_view(), name='copy_detail'),
    path('book-requests/', BookRequestListCreateView.as_view(), name='book_requests'),
]
