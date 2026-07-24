import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export function WelcomeStep({ name, onFinish }: { name: string; onFinish: () => void }) {
  return (
    <Card className="p-6 text-center space-y-4">
      <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold">Welcome to Cadence, {name}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your setup is ready. From here you can refine anything — add more bills, adjust safety
          minimums, or plan a purchase. Everything you set up can change as your life changes.
        </p>
      </div>
      <Button onClick={onFinish} className="mt-2">Open my dashboard</Button>
    </Card>
  );
}