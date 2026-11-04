#!/bin/zsh
set -e
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 が見つかりません。日付付き書き出しを開始できませんでした。"
  echo "この画面をChatGPTに送ってください。"
  read "reply?Enterキーで閉じます: "
  exit 1
fi
python3 - <<'PY'
import json,subprocess,sys,datetime,pathlib,hashlib
print('言葉の地層 | Appleメモの指定フォルダだけを書き出します。原本は変更しません。')
script=r'''
on pad2(n)
 return text -2 thru -1 of ("00" & ((n as integer) as string))
end pad2
on stamp(d)
 return ((year of d) as string) & "-" & pad2((month of d) as integer) & "-" & pad2(day of d) & "T" & pad2(hours of d) & ":" & pad2(minutes of d) & ":" & pad2(seconds of d)
end stamp
set folderName to text returned of (display dialog "Appleメモの『作詞メモ』があるフォルダ名を入力してください。指定フォルダだけ読み取ります。" default answer "" buttons {"中止","読み取る"} default button "読み取る")
if folderName is "" then error "フォルダ名が空です。"
if folderName contains "余白" then error "『余白』は今回は取り込まない方針です。"
set FS to ASCII character 31
set RS to ASCII character 30
set output to ""
set found to 0
set skipped to 0
set exported to 0
tell application "Notes"
 repeat with ac in every account
  set acName to name of ac as string
  repeat with f in every folder of ac
   if (name of f as string) is folderName then
    set found to found + 1
    repeat with n in every note of f
     try
      if (password protected of n) is false then
       set plain to plaintext of n as string
       set title to name of n as string
       set identifier to id of n as string
       set created to my stamp(creation date of n)
       set changed to my stamp(modification date of n)
       set output to output & acName & FS & folderName & FS & identifier & FS & title & FS & created & FS & changed & FS & plain & RS
       set exported to exported + 1
      else
       set skipped to skipped + 1
      end if
     on error
      set skipped to skipped + 1
     end try
    end repeat
   end if
  end repeat
 end repeat
end tell
if found is 0 then error "指定名のフォルダが見つかりません。まずトップ階層のフォルダ名を確認してください。"
if found > 1 then error "同名フォルダが複数あります。安全のため書き出しません。名前を区別してください。"
return (exported as string) & FS & (skipped as string) & RS & output
'''
try:
 r=subprocess.run(['osascript','-'],input=script,check=True,capture_output=True,text=True,timeout=1200)
except subprocess.CalledProcessError as e:
 print('Appleメモの読み取り失敗:',(e.stderr or e.stdout).strip())
 print('macOSから「メモ」へのアクセス許可を求められたら、許可してください。')
 sys.exit(1)
except Exception as e:
 print('書き出しエラー:',e);sys.exit(1)
pieces=[p for p in r.stdout.split('\x1e') if p.strip()]
if not pieces:raise SystemExit('メモを読み取れませんでした。')
header=pieces.pop(0).split('\x1f')
count=int(header[0]);skipped=int(header[1]);notes=[];seen=set()
for raw in pieces:
 fields=raw.split('\x1f')
 if len(fields)!=7:skipped+=1;continue
 account,folder,nid,title,created,modified,body=fields
 if not body.strip():skipped+=1;continue
 if (account,nid) in seen:continue
 seen.add((account,nid))
 notes.append({'source_id':hashlib.sha256((account+'\x1f'+nid).encode()).hexdigest(),'title':title,
 'text':body,'created_local':created,'modified_local':modified,'folder':folder,
 'timezone':'Macのローカル時刻（時差情報なし）'})
record={'format':'lyric_strata_apple_notes_v1','exported_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'notes':notes,'skipped_notes':skipped,'expected_readable_notes':count,
        'date_meaning':'Appleメモの作成日・更新日。歌詞を実際に思いついた日とは限りません。'}
out=pathlib.Path.home()/'Downloads'/('言葉の地層_Appleメモ_'+datetime.datetime.now().strftime('%Y%m%d_%H%M%S')+'.json')
with out.open('w',encoding='utf8') as f:json.dump(record,f,ensure_ascii=False,indent=2)
print('完了: %s 件（スキップ %s 件）'%(len(notes),skipped))
print('保存先:',out)
print('原稿が含まれる個人ファイルです。WebサイトやGitHubに直接公開しないでください。')
print('アプリの「日付付きで回収」からこのJSONを選択してください。')
PY
printf '\nEnterで閉じます。\n'
read reply
