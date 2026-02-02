# Homebrew formula for openrouter-launch
# Copy this to your homebrew tap repository (e.g., homebrew-tap/Formula/openrouter-launch.rb)
# or install directly: brew install truefrontier/tap/openrouter-launch

class OpenrouterLaunch < Formula
  desc "Launch AI coding tools with OpenRouter's 400+ model catalog"
  homepage "https://github.com/truefrontier/openrouter-launch"
  url "https://github.com/truefrontier/openrouter-launch/archive/refs/tags/v0.5.0.tar.gz"
  sha256 "PLACEHOLDER_SHA256"
  license "MIT"
  head "https://github.com/truefrontier/openrouter-launch.git", branch: "main"

  depends_on "curl"
  depends_on "jq" => :recommended

  def install
    bin.install "bin/openrouter-launch"
    bin.install_symlink "openrouter-launch" => "or-launch"
  end

  test do
    assert_match "openrouter-launch version", shell_output("#{bin}/openrouter-launch --version")
  end
end
