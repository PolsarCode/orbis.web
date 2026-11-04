"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Molecule from "@molecule";
import * as Template from "@template";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const router = useRouter();
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchProfile()
      .then((profile) =>
        router.replace(profile ? `/users/${profile.username}` : "/login"),
      )
      .catch(() => setFailed(true));
  }, [fetchProfile, router]);

  return (
    <Template.AppTemplate>
      <Template.CenteredTemplate>
        {failed ? (
          <Molecule.ConnectionError onRetry={() => window.location.reload()} />
        ) : (
          <Molecule.LoadingScreen />
        )}
      </Template.CenteredTemplate>
    </Template.AppTemplate>
  );
}
