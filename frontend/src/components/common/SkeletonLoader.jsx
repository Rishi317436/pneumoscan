import React from 'react';

export const SkeletonBox = ({ width = '100%', height = '20px', className = '', style = {} }) => (
  <div
    className={`rad-skeleton ${className}`}
    style={{ width, height, ...style }}
  />
);

export const SkeletonCard = ({ height = '180px' }) => (
  <div className="rad-card p-4">
    <SkeletonBox width="40%" height="24px" className="mb-3" />
    <SkeletonBox width="80%" height="16px" className="mb-2" />
    <SkeletonBox width="60%" height="16px" className="mb-4" />
    <SkeletonBox width="100%" height={height} />
  </div>
);

export const SkeletonTableRow = ({ cols = 6 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-3">
        <SkeletonBox width={i === 0 ? '70%' : '50%'} height="18px" />
      </td>
    ))}
  </tr>
);
