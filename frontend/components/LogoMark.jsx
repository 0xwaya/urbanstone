import Image from 'next/image';

export default function LogoMark() {
  return (
    <div className="h-12 w-12 flex items-center justify-center overflow-hidden">
      <Image
        src="/brand/amzlogo.png"
        alt="Amazon Granite LLC"
        width={48}
        height={48}
        sizes="48px"
        className="h-full w-full object-contain"
        priority
      />
    </div>
  );
}
