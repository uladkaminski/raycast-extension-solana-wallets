import { useState } from "react";
import { Form, ActionPanel, Action, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import * as solanaWeb3 from "@solana/web3.js";
import bs58 from "bs58";

interface Wallet {
  privateKey: string;
  publicKey?: string;
}

export default function Command() {
  const [count, setCount] = useState(10);
  const [includePublicKey, setIncludePublicKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const startTime = performance.now();
      
      const wallets: string[] = [];
      
      try {
        for (let i = 0; i < count; i++) {
          const keypair = solanaWeb3.Keypair.generate();
          const privateKey = bs58.encode(keypair.secretKey);
          const publicKey = keypair.publicKey.toBase58();
          wallets.push(includePublicKey ? `${privateKey}, ${publicKey}` : privateKey);
        }
        
        const endTime = performance.now();
        await showToast(Toast.Style.Success, `Generated ${count} wallets in ${(endTime - startTime).toFixed(2)}ms`);
        push(<WalletList wallets={wallets} />);
      } catch (error) {
        await showFailureToast("Failed to generate wallets", {
          title: "Wallet Generation Error",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Generate Wallets" onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="count"
        title="Number of Wallets"
        defaultValue="10"
        onChange={(value) => setCount(Number(value) || 10)}
      />
      <Form.Checkbox id="includePublicKey" label="Include Public Keys" onChange={setIncludePublicKey} />
    </Form>
  );
}

function WalletList({ wallets }: { wallets: string[] }) {
  const parsedWallets: Wallet[] = wallets.map((wallet) => {
    const [privateKey, publicKey] = wallet.split(", ");
    return { privateKey, publicKey };
  });

  const csvContent = wallets.join("\n");

  return (
    <List>
      <List.Item
        title="Copy All as CSV"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy All as CSV" content={csvContent} />
          </ActionPanel>
        }
      />
      {parsedWallets.map((wallet, index) => (
        <List.Item
          key={index}
          title={wallet.privateKey}
          subtitle={wallet.publicKey}
          accessories={[{ text: `Wallet #${index + 1}` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Private Key" content={wallet.privateKey} />
              {wallet.publicKey && (
                <Action.CopyToClipboard title="Copy Public Key" content={wallet.publicKey} />
              )}
              {wallet.publicKey && (
                <Action.CopyToClipboard 
                  title="Copy Both Keys" 
                  content={`${wallet.privateKey}, ${wallet.publicKey}`} 
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
