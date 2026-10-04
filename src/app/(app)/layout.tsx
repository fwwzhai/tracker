import { StoreProvider } from "@/lib/store";
import { UiProvider } from "@/lib/ui";
import { BottomBar } from "@/components/bottom-bar";
import { QuickAdd } from "@/components/quick-add";
import { ExpenseSheet } from "@/components/expense-sheet";
import { MealSheet } from "@/components/meal-sheet";
import { MealEdit } from "@/components/meal-edit";
import { WeightSheet } from "@/components/weight-sheet";
import { Toasts } from "@/components/toasts";
import { Gate } from "@/components/gate";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <StoreProvider>
      <UiProvider>
        <Gate>
          <main className="mx-auto max-w-md px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
            {children}
          </main>
          <BottomBar />
          <QuickAdd />
          <ExpenseSheet />
          <MealSheet />
          <MealEdit />
          <WeightSheet />
          <Toasts />
        </Gate>
      </UiProvider>
    </StoreProvider>
  );
}
