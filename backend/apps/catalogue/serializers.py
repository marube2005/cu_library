from rest_framework import serializers
from .models import Category, Title, Copy, BookRequest


class CategorySerializer(serializers.ModelSerializer):
    titles_count = serializers.IntegerField(source='titles.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'titles_count']


class CopySerializer(serializers.ModelSerializer):
    title_name = serializers.CharField(source='title.title', read_only=True)
    author = serializers.CharField(source='title.author', read_only=True)

    class Meta:
        model = Copy
        fields = [
            'id', 'title', 'title_name', 'author', 'copy_code',
            'shelf_location', 'condition', 'status', 'replacement_cost',
            'created_at'
        ]


class TitleListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    total_copies = serializers.IntegerField(source='total_copies_count', read_only=True)
    available_copies = serializers.IntegerField(source='available_copies_count', read_only=True)

    class Meta:
        model = Title
        fields = [
            'id', 'title', 'author', 'isbn', 'publisher', 'publication_year',
            'category', 'category_name', 'language', 'cover_image', 'cover_url',
            'total_copies', 'available_copies', 'is_hidden', 'created_at'
        ]


class TitleDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    copies = CopySerializer(many=True, read_only=True)
    total_copies = serializers.IntegerField(source='total_copies_count', read_only=True)
    available_copies = serializers.IntegerField(source='available_copies_count', read_only=True)
    active_reservations_count = serializers.SerializerMethodField()

    class Meta:
        model = Title
        fields = [
            'id', 'title', 'author', 'isbn', 'publisher', 'publication_year',
            'category', 'category_name', 'language', 'description', 'cover_image',
            'cover_url', 'total_copies', 'available_copies', 'active_reservations_count',
            'copies', 'is_hidden', 'created_at'
        ]

    def get_active_reservations_count(self, obj):
        return obj.reservations.filter(status='QUEUED').count()


class BookRequestSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)

    class Meta:
        model = BookRequest
        fields = ['id', 'member', 'member_name', 'title', 'author', 'note', 'status', 'created_at']
        read_only_fields = ['id', 'member', 'created_at']
