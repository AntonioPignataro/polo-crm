// Google Books API service
// Docs: https://developers.google.com/books/docs/v1/using

export interface GoogleBookData {
  title: string;
  subtitle: string | null;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  category: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  language: string | null;
  coverUrl: string | null;
}

interface GoogleBookVolume {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
    language?: string;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBookVolume[];
}

const BASE_URL = "https://www.googleapis.com/books/v1/volumes";

function normalizeVolume(volume: GoogleBookVolume): GoogleBookData {
  const info = volume.volumeInfo;

  const isbn13 = info.industryIdentifiers?.find((i) => i.type === "ISBN_13");
  const isbn10 = info.industryIdentifiers?.find((i) => i.type === "ISBN_10");
  const isbn = isbn13?.identifier ?? isbn10?.identifier ?? null;

  let coverUrl = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
  if (coverUrl) {
    coverUrl = coverUrl.replace("http://", "https://");
  }

  return {
    title: info.title ?? "",
    subtitle: info.subtitle ?? null,
    author: info.authors?.join(", ") ?? null,
    isbn,
    publisher: info.publisher ?? null,
    category: info.categories?.[0] ?? null,
    publishedDate: info.publishedDate ?? null,
    pageCount: info.pageCount ?? null,
    language: info.language ?? null,
    coverUrl,
  };
}

export async function searchBooksByIsbn(
  isbn: string
): Promise<GoogleBookData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const params = new URLSearchParams({
      q: `isbn:${isbn}`,
      maxResults: "1",
    });

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (apiKey) {
      params.set("key", apiKey);
    }

    const res = await fetch(`${BASE_URL}?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data: GoogleBooksResponse = await res.json();
    if (!data.items || data.totalItems === 0) return null;

    return normalizeVolume(data.items[0]);
  } catch {
    return null;
  }
}

export async function searchBooksByTitle(
  query: string
): Promise<GoogleBookData[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const params = new URLSearchParams({
      q: `intitle:${query}`,
      maxResults: "5",
      langRestrict: "pt",
    });

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    if (apiKey) {
      params.set("key", apiKey);
    }

    const res = await fetch(`${BASE_URL}?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data: GoogleBooksResponse = await res.json();
    if (!data.items || data.totalItems === 0) return [];

    return data.items.map(normalizeVolume);
  } catch {
    return [];
  }
}
