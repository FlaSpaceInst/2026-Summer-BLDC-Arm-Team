import logging
import socket
import time
from zeroconf import Zeroconf, ServiceInfo


def _is_valid_ipv4(ip):
    if not ip or ip.startswith("127.") or ip == "0.0.0.0":
        return False

    try:
        socket.inet_aton(ip)
        return True
    except OSError:
        return False


def get_valid_ip(max_attempts=10):
    for _ in range(max_attempts):
        candidates = []

        try:
            hostname = socket.gethostname()
            for entry in socket.getaddrinfo(hostname, None, socket.AF_INET):
                candidates.append(entry[4][0])
        except Exception:
            pass

        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.settimeout(0.4)
                s.connect(("8.8.8.8", 80))
                candidates.append(s.getsockname()[0])
        except Exception:
            pass

        for ip in candidates:
            if _is_valid_ipv4(ip):
                return ip

        time.sleep(1)

    return None


logging.basicConfig(level=logging.INFO, format='%(message)s')

ip_address = get_valid_ip()
if not ip_address:
    raise RuntimeError("Unable to determine a valid local IPv4 address for potato discovery")

logging.info(f"Valid IP obtained: {ip_address}")

service_type = "_potato._tcp.local."
service_name = f"{socket.gethostname()}"
port = 5000
txt = {'ip': ip_address, 'http_port': str(port)}

zeroconf = Zeroconf()
info = ServiceInfo(service_type, f"{service_name}.{service_type}",
                   addresses=[socket.inet_aton(ip_address)], port=port, properties=txt)

zeroconf.register_service(info)
logging.info(f"Potato device is now advertised on the network with IP: {ip_address} and port: {port}")

try:
    while True:
        time.sleep(3600)
except KeyboardInterrupt:
    pass
finally:
    zeroconf.unregister_service(info)
    zeroconf.close()
