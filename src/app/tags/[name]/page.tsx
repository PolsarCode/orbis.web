"use client";

import { useParams } from "next/navigation";
import * as Organism from "@organism";
import * as Template from "@template";
import { tagFromParam } from "@/lib/tags";

export default function TagPage() {
  const name = tagFromParam(useParams<{ name: string }>().name);

  return (
    <Template.AppTemplate>
      <Organism.TagView key={name} name={name} />
    </Template.AppTemplate>
  );
}
