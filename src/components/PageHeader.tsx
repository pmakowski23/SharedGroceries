type PageHeaderProps = {
  title: string;
};

export function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <h1 className="text-2xl font-bold">{title}</h1>
      <img
        src="/nourishly-favicons/logo.svg"
        alt="Nourishly logo"
        className="h-8 w-auto"
      />
    </div>
  );
}
