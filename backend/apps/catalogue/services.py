import requests


def lookup_isbn_metadata(isbn: str) -> dict:
    """
    Queries OpenLibrary and Google Books to fetch book metadata,
    including title, author, publisher, publish year, description, and cover image URL.
    """
    clean_isbn = isbn.replace('-', '').replace(' ', '').strip()
    result = {
        'isbn': clean_isbn,
        'title': '',
        'author': '',
        'publisher': '',
        'publication_year': None,
        'description': '',
        'cover_url': '',
        'source': None
    }

    # 1. Try Open Library
    try:
        ol_url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{clean_isbn}&jscmd=data&format=json"
        response = requests.get(ol_url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            key = f"ISBN:{clean_isbn}"
            if key in data:
                item = data[key]
                result['title'] = item.get('title', '')
                authors = item.get('authors', [])
                if authors:
                    result['author'] = ', '.join([a.get('name', '') for a in authors])
                publishers = item.get('publishers', [])
                if publishers:
                    result['publisher'] = publishers[0].get('name', '')
                publish_date = item.get('publish_date', '')
                if publish_date:
                    # extract 4-digit year if present
                    import re
                    year_match = re.search(r'\b(19\d\d|20\d\d)\b', publish_date)
                    if year_match:
                        result['publication_year'] = int(year_match.group(1))
                if 'cover' in item:
                    result['cover_url'] = item['cover'].get('large') or item['cover'].get('medium') or ''
                result['source'] = 'OpenLibrary'
                return result
    except Exception:
        pass

    # 2. Try Google Books fallback
    try:
        gb_url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{clean_isbn}"
        gb_res = requests.get(gb_url, timeout=5)
        if gb_res.status_code == 200:
            gb_data = gb_res.json()
            items = gb_data.get('items', [])
            if items:
                vol = items[0].get('volumeInfo', {})
                result['title'] = vol.get('title', '')
                authors = vol.get('authors', [])
                if authors:
                    result['author'] = ', '.join(authors)
                result['publisher'] = vol.get('publisher', '')
                pub_date = vol.get('publishedDate', '')
                if pub_date and len(pub_date) >= 4:
                    try:
                        result['publication_year'] = int(pub_date[:4])
                    except ValueError:
                        pass
                result['description'] = vol.get('description', '')
                image_links = vol.get('imageLinks', {})
                result['cover_url'] = image_links.get('thumbnail') or image_links.get('smallThumbnail') or ''
                result['source'] = 'GoogleBooks'
                return result
    except Exception:
        pass

    return result
