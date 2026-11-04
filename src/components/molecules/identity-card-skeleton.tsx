export function IdentityCardSkeleton() {
  return (
    <div aria-hidden className="h-full overflow-hidden rounded-lg border border-divider bg-surface">
      <div className="flex animate-pulse flex-col motion-reduce:animate-none">
        <span className="h-14 bg-rail-item" />
        <div className="flex items-end gap-3 px-3 pb-3">
          <span className="-mt-5 h-[42px] w-[42px] shrink-0 rounded-full border-[3px] border-surface bg-rail-item" />
          <div className="flex min-w-0 flex-1 flex-col pt-2">
            <span className="flex h-5 items-center">
              <span className="h-2.5 w-3/5 rounded-full bg-rail-item" />
            </span>
            <span className="flex h-4 items-center">
              <span className="h-2 w-2/5 rounded-full bg-rail-item" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
