import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@shared/ui/Button";
import { FormError } from "@shared/ui/FormError";

interface InfinitePages {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => Promise<unknown>;
}

/**
 * The next page of an infinite list, fetched as this scrolls into view. The button is the fallback where
 * IntersectionObserver doesn't fire, and the retry after a failure: the observer stays off then, or the
 * still-visible sentinel would refetch in a loop.
 */
export function LoadMoreButton({ query }: { query: InfinitePages }) {
  const { t } = useTranslation();
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = query;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  if (!hasNextPage) return null;
  return (
    <div ref={sentinel} className="mt-5 flex flex-col items-center gap-2">
      {isFetchNextPageError && <FormError>{t("common.loadFailed")}</FormError>}
      <Button variant="glass" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
        {t("common.more")}
      </Button>
    </div>
  );
}
