# 캘박 - 우리오늘만나?

카카오 로그인으로 닉네임과 프로필 사진을 불러와 약속 날짜를 조율하는 GitHub Pages 웹앱입니다.

## 현재 연결 정보

- GitHub Pages 예정 주소: `https://oneulmanna.github.io/calbak/`
- Supabase Project URL: `https://mtovsqqbxdgskxdspjym.supabase.co`
- Supabase publishable key: `supabase-config.js`에 입력 완료
- 카카오 로그인: Supabase Provider에서 활성화 완료
- 인증 복귀 페이지: `auth-callback.html`

## GitHub 업로드

1. ZIP 압축을 풉니다.
2. 압축을 푼 폴더 안의 파일과 `assets` 폴더를 전부 선택합니다.
3. GitHub의 `oneulmanna/calbak` 저장소에서 `uploading an existing file`을 누릅니다.
4. 선택한 파일을 업로드하고 `Commit changes`를 누릅니다.
5. `Settings` → `Pages`
6. Source: `Deploy from a branch`
7. Branch: `main`
8. Folder: `/(root)`
9. `Save`

저장소 첫 화면에서 `index.html`이 바로 보여야 합니다. ZIP 파일 자체를 올리면 안 됩니다.

## 중요

- `service_role`, `sb_secret`, 카카오 Client Secret은 GitHub에 올리면 안 됩니다.
- 현재 들어 있는 `sb_publishable_` 키는 브라우저용 공개 키입니다.
- 카카오 개발자 설정의 리다이렉트 URI는 Supabase 콜백 주소여야 합니다.
- Supabase URL Configuration에는 GitHub Pages 주소와 `auth-callback.html` 주소가 등록되어 있어야 합니다.
