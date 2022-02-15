# Server setup

## Install necessary RPMs
```bash
dnf install https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm -y
dnf update -y
dnf install bind-utils vim htop certbot python3-certbot-nginx mod_ssl firewalld git net-tools screen npm tar -y
```

## Install nvm
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
source ~/.bash_profile
nvm install --lts
```

## Install nginx (requires a different yum repo)
```bash
vim /etc/yum.repos.d/nginx.repo
```

### nginx.repo contents
```
[nginx-stable]
name=nginx stable repo
baseurl=http://nginx.org/packages/centos/$releasever/$basearch/
gpgcheck=1
enabled=1
gpgkey=https://nginx.org/keys/nginx_signing.key
module_hotfixes=true

[nginx-mainline]
name=nginx mainline repo
baseurl=http://nginx.org/packages/mainline/centos/$releasever/$basearch/
gpgcheck=1
enabled=0
gpgkey=https://nginx.org/keys/nginx_signing.key
module_hotfixes=true
```

```bash
dnf module enable nginx:1.20 -y
dnf install ngnix -y
```

## Setup firewall rules

```bash
systemctl start firewalld
firewall-cmd --permanent --zone=public --add-service=http
firewall-cmd --permanent --zone=public --add-service=https
firewall-cmd --permanent --zone=public --add-port=8080/tcp
firewall-cmd --reload
systemctl enable firewalld
firewall-cmd --permanent --list-all
```

We should reboot for good measure

```bash
reboot
```

## Generate letsencrypt cert

Only need to perform this once and renew it every 3 months (this can be automated via a cron job)

```bash
certbot certonly --manual --preferred-challenges=dns \
--email nightowlcasino@protonmail.com \
--agree-tos \
-d nightowlcasino.io \
-d www.nightowlcasino.io \
-d dev.nightowlcasino.io \
-d barred-swe-dev01.nightowlcasino.io \
-d barred-swe-p01.nightowlcasino.io
```

### Output
```
#Successfully received certificate.
#Certificate is saved at: /etc/letsencrypt/live/nightowlcasino.io/fullchain.pem
#Key is saved at:         /etc/letsencrypt/live/nightowlcasino.io/privkey.pem
#This certificate expires on 2022-05-14.
#These files will be updated when the certificate renews.

#NEXT STEPS:
#- This certificate will not be renewed automatically. Autorenewal of --manual certificates requires the use of an authentication hook script (--manual-auth-hook) but one was not provided. To renew this certificate, repeat this same certbot command before the certificate's expiry date.

#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
#If you like Certbot, please consider supporting our work by:
# * Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
# * Donating to EFF:                    https://eff.org/donate-le
#- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

## Create ssl config files
```bash
mkdir -p /etc/letsencrypt/live/nightowlcasino.io
mkdir -p /usr/share/nginx/html/nightowlcasino
touch /etc/letsencrypt/live/nightowlcasino.io/fullchain.pem
touch /etc/letsencrypt/live/nightowlcasino.io/privkey.pem
touch /etc/letsencrypt/options-ssl-nginx.conf
touch /etc/letsencrypt/ssl-dhparams.pem
vim <each file above>
```

## Update nginx conf file
```bash
vim /etc/nginx/nginx.conf
```

## Start and enable nginx
```bash
service nginx start
systemctl enable nginx
```

## Pull projects from github
```bash
git clone https://<github user>:<github PAT>@github.com/nightowlcasino/NightOwl-Frontend.git
git clone https://<github user>:<github PAT>@github.com/nightowlcasino/NightOwl-Backend.git
```

## Deploy Frontend
```bash
cd NightOwl-Frontend/
npm i
npm run build
cp -R build/* /usr/share/nginx/html/nightowlcasino/
```