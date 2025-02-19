import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  useNavigation,
  LocalStorage,
  confirmAlert,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import * as solanaWeb3 from "@solana/web3.js";
import bs58 from "bs58";

interface Preferences {
  outputFormat: "csv" | "json";
  defaultWalletCount: string;
  includePublicKeys: boolean;
  saveToHistory: boolean;
}

interface WalletSession {
  id: string;
  timestamp: number;
  wallets: string[];
  count: number;
  includePublicKey: boolean;
  generationTime: number;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [count, setCount] = useState(Number(preferences.defaultWalletCount) || 10);
  const [includePublicKey, setIncludePublicKey] = useState(preferences.includePublicKeys);
  const [saveToHistory, setSaveToHistory] = useState(preferences.saveToHistory);
  const [sessions, setSessions] = useState<WalletSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    async function loadSessions() {
      const existingSessions = await LocalStorage.getItem<string>("wallet-sessions");
      if (existingSessions) {
        setSessions(JSON.parse(existingSessions));
      }
    }
    loadSessions();
  }, []);

  const handleSubmit = async () => {
    if (count < 1 || count > 1000) {
      showToast(Toast.Style.Failure, "Number of wallets must be between 1 and 1000");
      return;
    }

    const startTime = performance.now();
    const wallets = Array.from({ length: count }, () => {
      const keypair = solanaWeb3.Keypair.generate();
      const privateKey = bs58.encode(keypair.secretKey);
      const publicKey = keypair.publicKey.toBase58();
      return includePublicKey ? `${privateKey}, ${publicKey}` : privateKey;
    });

    const endTime = performance.now();
    const generationTime = Number((endTime - startTime).toFixed(2));

    showToast(Toast.Style.Success, `Generated ${count} wallets in ${generationTime}ms`);

    if (saveToHistory) {
      const session: WalletSession = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        wallets,
        count,
        includePublicKey,
        generationTime,
      };

      const updatedSessions = [session, ...sessions];

      // Keep only last 50 sessions
      if (updatedSessions.length > 50) {
        updatedSessions.pop();
      }

      await LocalStorage.setItem("wallet-sessions", JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
    }

    push(<WalletList wallets={wallets} />);
  };

  if (showHistory) {
    const handleClearAllSessions = async () => {
      const confirmed = await confirmAlert({
        title: "Clear All Sessions",
        message: "Are you sure you want to delete all wallet generation sessions?",
        primaryAction: {
          title: "Clear All",
        },
      });

      if (confirmed) {
        const confirmedSecond = await confirmAlert({
          title: "Confirm Clear All",
          message: "This action cannot be undone. Are you absolutely sure?",
          primaryAction: {
            title: "Yes, Clear All",
          },
        });

        if (confirmedSecond) {
          await LocalStorage.removeItem("wallet-sessions");
          setSessions([]);
          showToast(Toast.Style.Success, "All sessions cleared");
        }
      }
    };

    return (
      <List
        actions={
          <ActionPanel>
            {sessions.length > 0 && (
              <Action
                title="Clear All Sessions"
                style={Action.Style.Destructive}
                onAction={handleClearAllSessions}
                shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              />
            )}
            <Action
              title="Back to Generator"
              onAction={() => setShowHistory(false)}
              shortcut={{ modifiers: ["cmd"], key: "escape" }}
            />
          </ActionPanel>
        }
      >
        {sessions.length === 0 ? (
          <List.EmptyView
            title="No History"
            description="Generate some wallets first to see them in history"
            icon="⏳"
          />
        ) : (
          sessions.map((session) => (
            <List.Item
              key={session.id}
              title={`${session.count} Wallets`}
              subtitle={new Date(session.timestamp).toLocaleString()}
              accessories={[
                { text: `${session.generationTime}ms` },
                { text: session.includePublicKey ? "With Public Keys" : "Private Keys Only" },
              ]}
              actions={
                <ActionPanel>
                  <Action title="View Wallets" onAction={() => push(<WalletList wallets={session.wallets} />)} />
                  <Action
                    title="Delete from History"
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const updatedSessions = sessions.filter((s) => s.id !== session.id);
                      await LocalStorage.setItem("wallet-sessions", JSON.stringify(updatedSessions));
                      setSessions(updatedSessions);
                      showToast(Toast.Style.Success, "Session deleted from history");
                    }}
                  />
                  <Action title="Back to Generator" onAction={() => setShowHistory(false)} />
                  {sessions.length > 1 && (
                    <Action
                      title="Clear All Sessions"
                      style={Action.Style.Destructive}
                      onAction={handleClearAllSessions}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))
        )}
      </List>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Generate Wallets" onAction={handleSubmit} />
          {sessions.length > 0 && <Action title="View History" onAction={() => setShowHistory(true)} />}
          <Action
            title="Open Extension Preferences"
            onAction={openCommandPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="count"
        title="Number of Wallets"
        defaultValue={preferences.defaultWalletCount}
        onChange={(value) => setCount(Number(value) || 10)}
        placeholder="Enter a number between 1 and 1000"
      />
      <Form.Checkbox
        id="includePublicKey"
        label="Include Public Keys"
        value={includePublicKey}
        onChange={setIncludePublicKey}
      />
      <Form.Checkbox id="saveToHistory" label="Save to History" value={saveToHistory} onChange={setSaveToHistory} />
    </Form>
  );
}

interface Wallet {
  privateKey: string;
  publicKey?: string;
}

function WalletList({ wallets }: { wallets: string[] }) {
  const { outputFormat } = getPreferenceValues<Preferences>();
  const parsedWallets: Wallet[] = wallets.map((wallet) => {
    const [privateKey, publicKey] = wallet.split(", ");
    return { privateKey, publicKey };
  });

  const hasPublicKeys = parsedWallets.some((w) => w.publicKey);

  if (outputFormat === "json") {
    const jsonContent = JSON.stringify(parsedWallets, null, 2);
    const privateKeysJson = JSON.stringify(
      parsedWallets.map((w) => ({ privateKey: w.privateKey })),
      null,
      2,
    );
    const publicKeysJson = hasPublicKeys
      ? JSON.stringify(
          parsedWallets.filter((w) => w.publicKey).map((w) => ({ publicKey: w.publicKey })),
          null,
          2,
        )
      : "";

    return (
      <List>
        <List.Item
          title="Copy All as JSON"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy All Wallets"
                content={jsonContent}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Private Keys"
                content={privateKeysJson}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              />
              {hasPublicKeys && (
                <Action.CopyToClipboard
                  title="Copy Public Keys"
                  content={publicKeysJson}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
              )}
            </ActionPanel>
          }
        />
        {parsedWallets.map((wallet, index) => (
          <List.Item
            key={index}
            title={wallet.privateKey}
            subtitle={wallet.publicKey}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Wallet" content={JSON.stringify(wallet, null, 2)} />
                <Action.CopyToClipboard
                  title="Copy Private Key"
                  content={JSON.stringify({ privateKey: wallet.privateKey }, null, 2)}
                />
                {wallet.publicKey && (
                  <Action.CopyToClipboard
                    title="Copy Public Key"
                    content={JSON.stringify({ publicKey: wallet.publicKey }, null, 2)}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Default CSV format
  const csvContent = wallets.join("\n");
  const privateKeysCsv = parsedWallets.map((w) => w.privateKey).join("\n");
  const publicKeysCsv = parsedWallets
    .filter((w) => w.publicKey)
    .map((w) => w.publicKey)
    .join("\n");

  return (
    <List>
      <List.Item
        title="Copy All as CSV"
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy All Wallets"
              content={csvContent}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Private Keys"
              content={privateKeysCsv}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
            {hasPublicKeys && (
              <Action.CopyToClipboard
                title="Copy Public Keys"
                content={publicKeysCsv}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
            )}
          </ActionPanel>
        }
      />
      {parsedWallets.map((wallet, index) => (
        <List.Item
          key={index}
          title={wallet.privateKey}
          subtitle={wallet.publicKey}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Wallet" content={wallets[index]} />
              <Action.CopyToClipboard title="Copy Private Key" content={wallet.privateKey} />
              {wallet.publicKey && <Action.CopyToClipboard title="Copy Public Key" content={wallet.publicKey} />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
