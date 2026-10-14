export async function api(method, path, body) {
  let res
  try {
    res = await fetch('/api/' + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body && JSON.stringify(body),
    })
  } catch {
    throw Object.assign(new Error('无法连接服务器，请确认后端已启动'), { status: 0 })
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(
      new Error(data.error || (res.status >= 500 ? '无法连接服务器，请确认后端已启动' : '请求失败')),
      { status: res.status },
    )
  }
  return data
}
