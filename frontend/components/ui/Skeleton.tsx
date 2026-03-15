import React from "react"

interface SkeletonProps {
  className?: string
  variant?: "rect" | "circle" | "text"
  width?: string | number
  height?: string | number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rect",
  width,
  height,
}) => {
  const baseStyles = "animate-pulse bg-white/5 relative overflow-hidden"
  const variantStyles = {
    rect: "rounded-md",
    circle: "rounded-full",
    text: "rounded h-4 w-full mb-2",
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={{
        width: width,
        height: height,
      }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_0_40px_rgba(255,255,255,0.05)]" />
    </div>
  )
}

export const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton width="40%" height={12} />
          <Skeleton width="20%" height={8} />
        </div>
      </div>
      <div className="space-y-3 pt-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} height={10} width={`${Math.random() * 40 + 60}%`} />
        ))}
      </div>
    </div>
  )
}

export const SkeletonChart: React.FC = () => {
    return (
        <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] space-y-6">
            <div className="flex justify-between items-end h-48 gap-2">
                {[40, 70, 45, 90, 65, 30, 85, 50].map((h, i) => (
                    <Skeleton 
                        key={i} 
                        height={`${h}%`} 
                        className="flex-1 min-w-[10px]" 
                    />
                ))}
            </div>
            <div className="flex justify-between">
                <Skeleton width="15%" height={8} />
                <Skeleton width="15%" height={8} />
                <Skeleton width="15%" height={8} />
                <Skeleton width="15%" height={8} />
            </div>
        </div>
    )
}
