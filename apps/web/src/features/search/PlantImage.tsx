import { useState } from 'react';
import { PlantMark } from '@/components/illustrations';
import { cn } from '@/components/ui';
import type { Plant } from './plantCatalog';

/** Real plant photo (hosted in /public/plants) with a branded SVG fallback if
 *  the image is missing or fails to load. */
export function PlantImage({
  plant,
  className,
  sizes,
}: {
  plant: Plant;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={cn('flex items-center justify-center bg-gradient-to-br', plant.grad, className)}>
        <PlantMark className="h-1/2 w-1/2 max-h-20 max-w-20 drop-shadow" />
      </div>
    );
  }

  return (
    <img
      src={`/plants/${plant.id}.jpg`}
      alt={plant.name}
      loading="lazy"
      sizes={sizes}
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  );
}
