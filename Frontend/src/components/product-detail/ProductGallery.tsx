import { useState } from 'react';
import { ChevronUp, ChevronDown, Maximize2 } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  thumbnail: string;
  productName: string;
}

export default function ProductGallery({
  images,
  thumbnail,
  productName,
}: ProductGalleryProps) {
  const allImages = images.length > 0 ? images : [thumbnail];
  const [active, setActive] = useState(0);
  const [visibleStart, setVisibleStart] = useState(0);

  const visibleThumbs = 4;
  const canShowPrev = visibleStart > 0;
  const canShowNext = visibleStart + visibleThumbs < allImages.length;

  return (
    <div className="flex gap-3">
      {/* Vertical thumbnails */}
      <div className="flex flex-col gap-2">
        {canShowPrev && (
          <button
            onClick={() => setVisibleStart((s) => Math.max(0, s - 1))}
            className="flex h-8 w-16 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:border-green-500 hover:text-green-600"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}

        {allImages
          .slice(visibleStart, visibleStart + visibleThumbs)
          .map((img, idx) => {
            const realIdx = visibleStart + idx;
            return (
              <button
                key={realIdx}
                onClick={() => setActive(realIdx)}
                className={`h-16 w-16 overflow-hidden rounded-md border-2 transition-all ${
                  active === realIdx
                    ? 'border-green-500'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img
                  src={img}
                  alt={`${productName} ${realIdx + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}

        <button
          onClick={() =>
            setVisibleStart((s) =>
              Math.min(allImages.length - visibleThumbs, s + 1),
            )
          }
          disabled={!canShowNext}
          className="flex h-8 w-16 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:border-green-500 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        <button
          className="flex h-8 w-16 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:border-green-500 hover:text-green-600"
          aria-label="Phóng to"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Main image */}
      <div className="flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white">
        <img
          src={allImages[active]}
          alt={productName}
          className="h-full w-full object-contain"
          style={{ aspectRatio: '1/1' }}
        />
      </div>
    </div>
  );
}
