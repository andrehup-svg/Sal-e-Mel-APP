type TagVariant = "categoria" | "destaque" | "restricao" | "sucesso" | "erro";

const TAG_CLASSES: Record<TagVariant, string> = {
  categoria: "bg-mel-200 text-tinta",
  destaque: "bg-confete-rosa text-tinta",
  restricao: "bg-confete-menta text-tinta",
  sucesso: "bg-sucesso text-papel",
  erro: "bg-erro text-papel",
};

export function Tag({
  variant = "categoria",
  children,
}: {
  variant?: TagVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-block rounded-full px-[14px] py-[7px] font-ui text-[13px] font-extrabold ${TAG_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
