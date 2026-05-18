import { PageHero, PlaceholderModule } from "../components/admin/AdminPrimitives.jsx";

export function AdminPlaceholderPage({ eyebrow, title, description }) {
  return (
    <div className="space-y-6">
      <PageHero eyebrow={eyebrow} title={title} description={description} />
      <PlaceholderModule
        title={`${title} module is staged for the next release`}
        description="The new admin information architecture is in place, and this module has a reserved home in the sidebar. The current rollout prioritizes dashboard, products, inventory, orders, and notification operations first."
      />
    </div>
  );
}
