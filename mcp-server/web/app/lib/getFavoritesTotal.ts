export async function getFavoritesTotal(): Promise<number> {
  try {
    const res = await fetch('/api/favorites/total');
    if (!res.ok) {
      console.error('Failed to fetch favorites total:', res.statusText);
      return 0;
    }
    const { total } = await res.json();
    return total || 0;
  } catch (error) {
    console.error('Error fetching favorites total:', error);
    return 0;
  }
}