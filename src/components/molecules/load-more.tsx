"use client";

import { useEffect, useRef } from "react";
import { SkeletonCard } from "./feed-skeleton";
import { RetryAlert } from "./retry-alert";

type LoadMoreProps = {
  onLoadMore: () => void;
  loading: boolean;
  failed: boolean;
};

export function LoadMore({ onLoadMore, loading, failed }: LoadMoreProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const callback = useRef(onLoadMore);

  useEffect(() => {
    callback.current = onLoadMore;
  });

  useEffect(() => {
    const element = sentinel.current;
    if (!element || loading || failed) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback.current();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [loading, failed]);

  return (
    <div ref={sentinel} className="flex min-h-12 flex-col justify-center">
      {failed ? (
        <RetryAlert onRetry={onLoadMore}>Couldn&apos;t load more posts.</RetryAlert>
      ) : (
        loading && (
          <div role="status">
            <span className="sr-only">Loading more posts</span>
            <SkeletonCard />
          </div>
        )
      )}
    </div>
  );
}
