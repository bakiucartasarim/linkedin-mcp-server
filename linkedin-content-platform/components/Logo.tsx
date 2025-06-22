interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ className = '', size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const fontSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className={`${sizeClasses[size]} bg-[#0077B5] rounded flex items-center justify-center flex-shrink-0`}>
        <span className={`text-white font-black ${fontSizeClasses[size]}`}>
          SH
        </span>
      </div>
      {showText && (
        <span className={`ml-3 font-semibold text-gray-900 ${textSizeClasses[size]}`}>
          SocialHub
        </span>
      )}
    </div>
  );
}