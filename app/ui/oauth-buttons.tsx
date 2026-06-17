import { oauthProviders } from "@/auth";
import OAuthButton from "@/app/ui/oauth-button";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3a7.24 7.24 0 0 1-10.78-3.8H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.22 7.22 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A12 12 0 0 0 1.28 6.63l4 3.09A7.17 7.17 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

const icons = {
  google: <GoogleIcon />,
};

export default function OAuthButtons() {
  if (oauthProviders.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or continue with
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-4 space-y-3">
        {oauthProviders.map((provider) => (
          <OAuthButton key={provider.id} provider={provider.id}>
            {icons[provider.id]}
            Continue with {provider.name}
          </OAuthButton>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-zinc-400">
        You can only sign in with a verified email address.
      </p>
    </div>
  );
}
