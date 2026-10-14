# ==============================================================================
# Chef Recipe: RecruitX DevOps Environment Setup (recipes/default.rb)
# Automates prerequisite package installation and system configuration
# ==============================================================================

log 'Starting RecruitX Chef Provisioning' do
  level :info
end

case node['platform_family']
when 'windows'
  # 1. Install Git via Chocolatey Package Manager on Windows
  chocolatey_package 'git' do
    action :install
  end

  # 2. Install Node.js LTS
  chocolatey_package 'nodejs-lts' do
    action :install
  end

  # 3. Install Python 3
  chocolatey_package 'python3' do
    action :install
  end

  # 4. Install OpenJDK (for Jenkins)
  chocolatey_package 'openjdk' do
    action :install
  end

  # 5. Install Docker Desktop
  chocolatey_package 'docker-desktop' do
    action :install
  end

when 'debian', 'rhel'
  # Linux environment package installations
  package ['git', 'python3', 'python3-pip', 'curl', 'wget'] do
    action :install
  end
end

# Ensure project working directory exists
directory 'C:/FINAL YEAR PROJECT/devops' do
  recursive true
  action :create
end

log 'RecruitX Chef Provisioning Completed Successfully' do
  level :info
end
