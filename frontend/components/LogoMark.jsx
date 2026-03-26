import Image from 'next/image';

export default function LogoMark({ className = 'h-12 w-12', imageClassName = 'h-full w-full object-contain' }) {
  return (
    <div className={`${className} flex items-center justify-center overflow-hidden`}>
      <Image
        src="/brand/amzlogo.png"
        alt="Amazon Granite LLC"
        width={48}
        height={48}
        sizes="48px"
        className={imageClassName}
        priority
      />
    </div>
  );
}
