#!/bin/bash

#############################################################
# MCP Integration Hub - Quick Setup Script
#############################################################

echo "🚀 MCP Integration Hub Setup"
echo "============================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install it first."
    echo "Visit: https://nodejs.org"
    exit 1
fi

# Check current directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the mcp-integration-hub directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment file
if [ ! -f ".env" ]; then
    echo ""
    echo "🔧 Setting up environment variables..."
    echo "Please enter your API keys (press Enter to skip):"
    echo ""
    
    read -p "GitHub Token (ghp_...): " GITHUB_TOKEN
    read -p "OpenWeather API Key: " OPENWEATHER_KEY
    read -p "OpenAI API Key (optional): " OPENAI_KEY
    
    # Create .env in the expected location
    mkdir -p ~/mcp-final
    cat > ~/mcp-final/.env << EOF
GITHUB_TOKEN=$GITHUB_TOKEN
OPENWEATHER_API_KEY=$OPENWEATHER_KEY
OPENAI_API_KEY=$OPENAI_KEY
EOF
    
    echo "✅ API keys saved to ~/mcp-final/.env"
fi

# Configure Claude Desktop
echo ""
echo "🔧 Configuring Claude Desktop..."
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
mkdir -p "$(dirname "$CLAUDE_CONFIG")"

cat > "$CLAUDE_CONFIG" << EOF
{
  "mcpServers": {
    "mcp-integration-hub": {
      "command": "node",
      "args": ["$(pwd)/server.js"]
    }
  }
}
EOF

echo "✅ Claude Desktop configured"

# Test the server
echo ""
echo "🧪 Testing server..."
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node server.js 2>/dev/null | grep -q "github_push_file" && echo "✅ Server test passed" || echo "⚠️ Server test failed"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Restart Claude Desktop (Cmd+Q, then reopen)"
echo "2. Look for 'mcp-integration-hub' in the model selector"
echo "3. Test commands:"
echo "   - 'What's the weather in San Francisco?'"
echo "   - 'List my GitHub repositories'"
echo "   - 'Push a test file to my repo'"
echo "═══════════════════════════════════════════════════════"
