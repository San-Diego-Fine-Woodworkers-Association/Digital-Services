import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

type Props = {
  url: string;
  firstName: string | null;
};

export function MagicLinkEmail({ url, firstName }: Props) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  return (
    <Html>
      <Head />
      <Preview>Confirm this device to sign in to SDFWA</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", padding: "24px" }}>
        <Container style={{ maxWidth: 480 }}>
          <Heading style={{ fontSize: 20 }}>Sign in to SDFWA</Heading>
          <Text>{greeting}</Text>
          <Text>
            You&apos;re signing in from a new browser. Click the link below to
            confirm this device. This link expires in 15 minutes and can only
            be used once.
          </Text>
          <Text>
            <Link href={url}>{url}</Link>
          </Text>
          <Text style={{ color: "#666", fontSize: 12 }}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail;
