import hmac
import hashlib
import datetime
import urllib.request
import os

account_id = '0174494300e1556c33861a7dbf51f3fd'
access_key = '2820aea558adbecc942899ef3a36f4a7'
secret_key = 'f5c9246850d1200fb89fe2f2a0a50f676202a729c04d72981151799eabc62918'
bucket = 'greenphone-media'
public_url = 'https://pub-df08b62e1cfd4f979be4298a44bb0da0.r2.dev'

def sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def get_signature_key(key, date_stamp, region_name, service_name):
    k_date = sign(('AWS4' + key).encode('utf-8'), date_stamp)
    k_region = hmac.new(k_date, region_name.encode('utf-8'), hashlib.sha256).digest()
    k_service = hmac.new(k_region, service_name.encode('utf-8'), hashlib.sha256).digest()
    k_signing = hmac.new(k_service, 'aws4_request'.encode('utf-8'), hashlib.sha256).digest()
    return k_signing

def upload_to_r2(object_key, data, content_type='image/svg+xml'):
    endpoint = f'https://{account_id}.r2.cloudflarestorage.com'
    now = datetime.datetime.now(datetime.timezone.utc)
    amz_date = now.strftime('%Y%m%dT%H%M%SZ')
    date_stamp = now.strftime('%Y%m%d')

    payload_hash = hashlib.sha256(data).hexdigest()
    canonical_uri = f'/{bucket}/{object_key}'
    canonical_headers = (
        f'content-type:{content_type}\n'
        f'host:{account_id}.r2.cloudflarestorage.com\n'
        f'x-amz-content-sha256:{payload_hash}\n'
        f'x-amz-date:{amz_date}\n'
    )
    signed_headers = 'content-type;host;x-amz-content-sha256;x-amz-date'
    canonical_request = f'PUT\n{canonical_uri}\n\n{canonical_headers}\n{signed_headers}\n{payload_hash}'

    algorithm = 'AWS4-HMAC-SHA256'
    credential_scope = f'{date_stamp}/auto/s3/aws4_request'
    cr_hash = hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
    string_to_sign = f'{algorithm}\n{amz_date}\n{credential_scope}\n{cr_hash}'

    signing_key = get_signature_key(secret_key, date_stamp, 'auto', 's3')
    signature = hmac.new(signing_key, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

    auth_header = (
        f'{algorithm} Credential={access_key}/{credential_scope}, '
        f'SignedHeaders={signed_headers}, Signature={signature}'
    )

    req = urllib.request.Request(f'{endpoint}{canonical_uri}', data=data, method='PUT')
    req.add_header('Content-Type', content_type)
    req.add_header('x-amz-date', amz_date)
    req.add_header('x-amz-content-sha256', payload_hash)
    req.add_header('Authorization', auth_header)

    with urllib.request.urlopen(req) as resp:
        if resp.status in (200, 204):
            return f'{public_url}/{object_key}'
        else:
            raise Exception(f'Status {resp.status}')

# Brand SVGs (Sharp vector graphics)
LOGOS = {
    'google-pixel.svg': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>''',
    'asus.svg': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40"><path fill="#00539B" d="M16 35H0L24 5h16l24 30H48l-4-5H20l-4 5zm11-13h10l-5-7-5 7zm53 13H64V5h16v30zm48 0h-16l-3-4c-3 3-7 4-12 4-10 0-17-7-17-17s7-17 17-17c5 0 9 1 12 4V5h16v30zm-16-15c0-6-4-10-10-10s-10 4-10 10 4 10 10 10 10-4 10-10zm46 15h-15l-12-14v14h-16V5h16v13l11-13h16l-14 15 14 15zm40-17c0 10-7 17-17 17s-17-7-17-17 7-17 17-17 17 7 17 17zm-16 0c0-6-4-10-10-10s-10 4-10 10 4 10 10 10 10-4 10-10z"/></svg>''',
    'oneplus.svg': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="90" height="90" x="5" y="5" rx="16" fill="#F50514"/><path fill="#FFF" d="M44 32h12v12h12v12H56v12H44V56H32V44h12V32z"/><circle cx="50" cy="50" r="32" fill="none" stroke="#FFF" stroke-width="6"/></svg>''',
    'sony.svg': '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50"><text x="10" y="38" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="44" fill="#000" letter-spacing="4">SONY</text></svg>'''
}

def main():
    uploaded = {}
    for filename, svg_str in LOGOS.items():
        key = f'brands/{filename}'
        url = upload_to_r2(key, svg_str.encode('utf-8'))
        uploaded[filename] = url
        print(f'Uploaded {filename} -> {url}')
    return uploaded

if __name__ == '__main__':
    main()
