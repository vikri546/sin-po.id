import React from 'react';
import ReactSkeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  count?: number;
  height?: number | string;
  width?: number | string;
  circle?: boolean;
}

export default function Skeleton({ 
  className = '', 
  style, 
  count = 1,
  height,
  width,
  circle = false
}: SkeletonProps) {
  return (
    <div className={`inline-block overflow-hidden ${className}`} style={style}>
      {/* Light Mode Shimmer Theme */}
      <div className="block dark:hidden w-full h-full">
        <SkeletonTheme baseColor="#E7E4D9" highlightColor="#F4F2EB">
          <ReactSkeleton 
            count={count} 
            height={height || "100%"} 
            width={width || "100%"} 
            circle={circle} 
            className="h-full w-full block"
            containerClassName="w-full h-full block leading-none"
          />
        </SkeletonTheme>
      </div>

      {/* Dark Mode Shimmer Theme */}
      <div className="hidden dark:block w-full h-full">
        <SkeletonTheme baseColor="#27272A" highlightColor="#3F3F46">
          <ReactSkeleton 
            count={count} 
            height={height || "100%"} 
            width={width || "100%"} 
            circle={circle} 
            className="h-full w-full block"
            containerClassName="w-full h-full block leading-none"
          />
        </SkeletonTheme>
      </div>
    </div>
  );
}

export { SkeletonTheme, ReactSkeleton as BaseSkeleton };
