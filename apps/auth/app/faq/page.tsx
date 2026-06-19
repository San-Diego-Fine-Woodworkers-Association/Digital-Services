import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import memberCard from "@/public/assets/sample-member-card.jpeg";
import { Button } from "@sdfwa/ui/components/button";
import { Card, CardContent } from "@sdfwa/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@sdfwa/ui/components/collapsible";

export default function FaqPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        <Card>
          <CardContent className="flex flex-col gap-8 p-6">
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-3xl font-bold">Sign-in Help</h1>
              <p className="text-muted-foreground text-balance text-sm">
                Trouble signing in? Here&apos;s how to track down your details.
              </p>
            </div>

            <section id="member-id" className="flex scroll-mt-6 flex-col gap-2">
              <h2 className="text-xl font-semibold">Forgot Member ID</h2>
              <p className="text-muted-foreground text-sm">
                Your Member ID is the number printed under the barcode on your
                SDFWA membership card. If you don&apos;t have your card handy,
                ProClass support can help you track that number down — reach them
                at{" "}
                <a
                  href="mailto:helpdesk@sdfwa.org"
                  className="font-medium underline underline-offset-4"
                >
                  helpdesk@sdfwa.org
                </a>
                .
              </p>
              <Collapsible className="mt-1">
                <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
                  <ChevronRight className="size-4 transition-transform group-data-[state=open]:rotate-90" />
                  Example Member Card
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Image
                    src={memberCard}
                    alt="Sample SDFWA membership card showing the Member ID printed below the barcode"
                    placeholder="blur"
                    sizes="(max-width: 512px) 100vw, 512px"
                    className="mt-2 h-auto w-full rounded-lg border"
                  />
                </CollapsibleContent>
              </Collapsible>
            </section>

            <section id="email" className="flex scroll-mt-6 flex-col gap-2">
              <h2 className="text-xl font-semibold">Forgot email</h2>
              <p className="text-muted-foreground text-sm">
                Use the same email address you use to log into ProClass. Check
                your password manager to find it if you have it saved. If
                you&apos;re still not sure, contact{" "}
                <a
                  href="mailto:helpdesk@sdfwa.org"
                  className="font-medium underline underline-offset-4"
                >
                  helpdesk@sdfwa.org
                </a>{" "}
                for help.
              </p>
            </section>

            <div className="flex justify-center">
              <Button asChild size="lg" className="text">
                <Link href="/login">Back to Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
