import { getBooks } from "@/modules/library/queries/get-books";
import { getMembersForLoan } from "@/modules/library/queries/get-members-for-loan";
import { LibraryView } from "@/modules/library/components/library-view";

export default async function BibliotecaPage() {
  const [books, members] = await Promise.all([
    getBooks(),
    getMembersForLoan(),
  ]);

  return (
    <div className="space-y-4 md:space-y-6">
      <LibraryView books={books} members={members} />
    </div>
  );
}
