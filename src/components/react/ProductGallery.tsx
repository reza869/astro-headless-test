// ============================================================
//  ProductGallery — PDP image gallery with thumbnail rail.
//  Reserves aspect ratio to avoid layout shift.
// ============================================================
import { useState } from 'react';
import type { Image } from '~/lib/shopify/types';

interface Props {
  images: Image[];
  title: string;
}

export default function ProductGallery({ images, title }: Props) {
  const [active, setActive] = useState(0);
  const gallery = images.length ? images : [];
  const current = gallery[active];

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface">
        {current ? (
          <img
            src={current.url}
            alt={current.altText ?? title}
            className="h-full w-full object-cover"
            width={current.width ?? undefined}
            height={current.height ?? undefined}
            fetchPriority="high"
          />
        ) : (
          <div className="grid h-full place-items-center text-text-muted">No image</div>
        )}
        <span className="absolute bottom-3 right-3 rounded-sm bg-surface/85 px-2 py-1 font-mono text-[0.7rem] text-text-secondary backdrop-blur-sm tabular">
          {String(active + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}
        </span>
      </div>

      {/* Announce the active image to assistive tech. */}
      <p className="sr-only" aria-live="polite">
        Image {active + 1} of {gallery.length}
      </p>

      {/* Thumbnails — image-select buttons (not a tabs widget). */}
      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label={`${title} images`}>
          {gallery.map((img, i) => (
            <button
              key={img.id ?? img.url}
              type="button"
              aria-pressed={i === active}
              aria-label={`Show image ${i + 1}`}
              onClick={() => setActive(i)}
              className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-md border transition-fluid ${
                i === active ? 'border-dark' : 'border-border opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
