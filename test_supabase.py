import urllib.request
import json

tables = ['profiles', 'courses', 'course_topics', 'questions', 'question_choices', 'test_blocks', 'test_block_items', 'test_responses']
headers = {
    'apikey': 'sb_publishable_h0rAeFDW-_yQA3EGqay-hA_wcupylm0',
    'Authorization': 'Bearer sb_publishable_h0rAeFDW-_yQA3EGqay-hA_wcupylm0',
    'Content-Type': 'application/json'
}
for t in tables:
    url = f'https://fzjzjzdamehxbgikiskt.supabase.co/rest/v1/{t}?select=*&limit=1'
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            print(f'{t}: OK')
    except Exception as e:
        print(f'{t}: ERROR {e}')
