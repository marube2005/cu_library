import csv
import io
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from .models import Category, Title, Copy, BookRequest
from .serializers import (
    CategorySerializer, TitleListSerializer, TitleDetailSerializer,
    CopySerializer, BookRequestSerializer
)
from .services import lookup_isbn_metadata


class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class TitleListView(generics.ListCreateAPIView):
    serializer_class = TitleListSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Title.objects.filter(is_hidden=False).order_by('title')
        search = self.request.query_params.get('search')
        category_slug = self.request.query_params.get('category')
        available_only = self.request.query_params.get('available')

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(author__icontains=search) |
                Q(isbn__icontains=search)
            )

        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        if available_only and available_only.lower() in ['true', '1']:
            queryset = queryset.filter(copies__status=Copy.Status.AVAILABLE).distinct()

        return queryset


class TitleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Title.objects.all()
    serializer_class = TitleDetailSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class CopyListCreateView(generics.ListCreateAPIView):
    serializer_class = CopySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Copy.objects.all().order_by('copy_code')
        title_id = self.request.query_params.get('title')
        copy_code = self.request.query_params.get('code')
        if title_id:
            queryset = queryset.filter(title_id=title_id)
        if copy_code:
            queryset = queryset.filter(copy_code__iexact=copy_code.strip())
        return queryset


class CopyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Copy.objects.all()
    serializer_class = CopySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class ISBNLookupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        isbn = request.data.get('isbn', '').strip()
        if not isbn:
            return Response({'detail': 'ISBN parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        metadata = lookup_isbn_metadata(isbn)
        return Response(metadata)


class MissingCoversListView(generics.ListAPIView):
    serializer_class = TitleListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Title.objects.filter(
            Q(cover_image='') | Q(cover_image__isnull=True),
            Q(cover_url='') | Q(cover_url__isnull=True)
        ).order_by('title')


class BulkImportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_library_staff:
            return Response({'detail': 'Staff privileges required for bulk import.'}, status=status.HTTP_403_FORBIDDEN)

        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'CSV file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = file.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            created_titles = 0
            created_copies = 0
            errors = []

            for row_idx, row in enumerate(reader, start=2):
                copy_code = row.get('copy_code', '').strip()
                title_text = row.get('title', '').strip()
                author_text = row.get('author', '').strip()
                isbn_text = row.get('isbn', '').strip()
                category_text = row.get('category', '').strip()
                shelf_location = row.get('shelf_location', '').strip()
                condition = row.get('condition', 'GOOD').strip().upper()

                if not copy_code or not title_text or not author_text:
                    errors.append(f"Row {row_idx}: Missing copy_code, title, or author.")
                    continue

                if Copy.objects.filter(copy_code=copy_code).exists():
                    errors.append(f"Row {row_idx}: Copy code '{copy_code}' already exists.")
                    continue

                category = None
                if category_text:
                    category, _ = Category.objects.get_or_create(name=category_text)

                # Match existing title by ISBN or title & author
                title_obj = None
                if isbn_text:
                    title_obj = Title.objects.filter(isbn=isbn_text).first()
                if not title_obj:
                    title_obj = Title.objects.filter(title__iexact=title_text, author__iexact=author_text).first()

                if not title_obj:
                    title_obj = Title.objects.create(
                        title=title_text,
                        author=author_text,
                        isbn=isbn_text,
                        category=category
                    )
                    created_titles += 1

                # Create copy
                cond_val = condition if condition in [c[0] for c in Copy.Condition.choices] else Copy.Condition.GOOD
                Copy.objects.create(
                    title=title_obj,
                    copy_code=copy_code,
                    shelf_location=shelf_location,
                    condition=cond_val,
                    status=Copy.Status.AVAILABLE
                )
                created_copies += 1

            return Response({
                'message': f'Bulk import complete. Created {created_titles} titles and {created_copies} copies.',
                'created_titles': created_titles,
                'created_copies': created_copies,
                'errors': errors
            })
        except Exception as e:
            return Response({'detail': f'Import failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


class BookRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = BookRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_library_staff:
            return BookRequest.objects.all().order_by('-created_at')
        return BookRequest.objects.filter(member=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(member=self.request.user)
