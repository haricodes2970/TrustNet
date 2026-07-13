import { useEffect, useRef, useState } from "react";
import api from "./api";

export async function searchRequest(query) {
  const { data } = await api.get("/v1/search", { params: { q: query } });
  return data?.data ?? { users: [], startups: [], communities: [], posts: [] };
}

const EMPTY_RESULTS = { users: [], startups: [], communities: [], posts: [] };

export function useGlobalSearch(delay = 300) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const latestRequest = useRef(0);

  useEffect(() => {
    const term = query.trim();

    if (!term) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++latestRequest.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchRequest(term);
        if (requestId === latestRequest.current) {
          setResults(data);
          setError(null);
        }
      } catch (err) {
        if (requestId === latestRequest.current) {
          setError(err?.response?.data?.message || err.message || "Search failed");
          setResults(EMPTY_RESULTS);
        }
      } finally {
        if (requestId === latestRequest.current) {
          setLoading(false);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  return { query, setQuery, results, loading, error };
}
