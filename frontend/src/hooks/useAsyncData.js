import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const defaultOptions = {
  immediate: true,
  errorMessage: "Unable to fetch data.",
};

export const useAsyncData = (fetcher, deps = [], options = {}) => {
  const merged = { ...defaultOptions, ...options };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(merged.immediate));
  const [error, setError] = useState("");

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError("");
      try {
        const result = await fetcher(...args);
        setData(result);
        return result;
      } catch (err) {
        const message = err?.response?.data?.message || merged.errorMessage;
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetcher, merged.errorMessage],
  );

  useEffect(() => {
    if (merged.immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, execute };
};
