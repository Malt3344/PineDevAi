/**
 * The Pine Script v6 API surface: every built-in function signature, and
 * every built-in variable and constant with its type. Signatures only —
 * the reference's prose descriptions are deliberately not included, both
 * to keep this small and because the signatures are the part that stops a
 * model inventing functions that do not exist.
 *
 * Extracted from the rendered TradingView language reference at
 * https://www.tradingview.com/pine-script-reference/v6/ — regenerate from
 * that page when Pine gets a new version.
 *
 * Roughly 11876 tokens. That is cheap on the free models, but it is charged
 * as input on every paid call, so measure before turning it on for a
 * premium model.
 */
export const PINE_V6_API = `PINE SCRIPT v6 — BUILT-IN FUNCTIONS (719 signatures)
alert(message, freq) → void
alertcondition(condition, title, message) → void
array.abs(id) → array<float>
array.abs(id) → array<int>
array.avg(id) → series float
array.avg(id) → series int
array.binary_search(id, val) → series int
array.binary_search(id, val, sort_field) → series int
array.binary_search_leftmost(id, val) → series int
array.binary_search_leftmost(id, val, sort_field) → series int
array.binary_search_rightmost(id, val) → series int
array.binary_search_rightmost(id, val, sort_field) → series int
array.clear(id) → void
array.concat(id1, id2) → array<type>
array.copy(id) → array<type>
array.covariance(id1, id2, biased) → series float
array.every(id) → series bool
array.fill(id, value, index_from, index_to) → void
array.first(id) → series <type>
array.from(arg0, arg1, ...) → array<type>
array.from(arg0, arg1, ...) → array<enum>
array.from(arg0, arg1, ...) → array<label>
array.from(arg0, arg1, ...) → array<line>
array.from(arg0, arg1, ...) → array<box>
array.from(arg0, arg1, ...) → array<table>
array.from(arg0, arg1, ...) → array<linefill>
array.from(arg0, arg1, ...) → array<string>
array.from(arg0, arg1, ...) → array<color>
array.from(arg0, arg1, ...) → array<int>
array.from(arg0, arg1, ...) → array<float>
array.from(arg0, arg1, ...) → array<bool>
array.get(id, index) → series <type>
array.includes(id, value) → series bool
array.indexof(id, value) → series int
array.insert(id, index, value) → void
array.join(id, separator) → series string
array.last(id) → series <type>
array.lastindexof(id, value) → series int
array.max(id, nth) → series float
array.max(id, nth) → series int
array.median(id) → series float
array.median(id) → series int
array.min(id, nth) → series float
array.min(id, nth) → series int
array.mode(id) → series float
array.mode(id) → series int
array.new_bool(size, initial_value) → array<bool>
array.new_box(size, initial_value) → array<box>
array.new_color(size, initial_value) → array<color>
array.new_float(size, initial_value) → array<float>
array.new_int(size, initial_value) → array<int>
array.new_label(size, initial_value) → array<label>
array.new_line(size, initial_value) → array<line>
array.new_linefill(size, initial_value) → array<linefill>
array.new_string(size, initial_value) → array<string>
array.new_table(size, initial_value) → array<table>
array.new<type>(size, initial_value) → array<type>
array.percentile_linear_interpolation(id, percentage) → series float
array.percentile_linear_interpolation(id, percentage) → series int
array.percentile_nearest_rank(id, percentage) → series float
array.percentile_nearest_rank(id, percentage) → series int
array.percentrank(id, index) → series float
array.percentrank(id, index) → series int
array.pop(id) → series <type>
array.push(id, value) → void
array.range(id) → series float
array.range(id) → series int
array.remove(id, index) → series <type>
array.reverse(id) → void
array.set(id, index, value) → void
array.shift(id) → series <type>
array.size(id) → series int
array.slice(id, index_from, index_to) → array<type>
array.some(id) → series bool
array.sort(id, order) → void
array.sort(id, order, sort_field) → void
array.sort_indices(id, order) → array<int>
array.sort_indices(id, order, sort_field) → array<int>
array.standardize(id) → array<float>
array.standardize(id) → array<int>
array.stdev(id, biased) → series float
array.stdev(id, biased) → series int
array.sum(id) → series float
array.sum(id) → series int
array.unshift(id, value) → void
array.variance(id, biased) → series float
array.variance(id, biased) → series int
barcolor(color, offset, editable, show_last, title, display) → void
bgcolor(color, offset, editable, show_last, title, display, force_overlay) → void
bool(x) → const bool
bool(x) → input bool
bool(x) → simple bool
bool(x) → series bool
box(x) → series box
box.copy(id) → series box
box.delete(id) → void
box.get_bottom(id) → series float
box.get_left(id) → series int
box.get_right(id) → series int
box.get_top(id) → series float
box.new(top_left, bottom_right, border_color, border_width, border_style, extend, xloc, bgcolor, text, text_size, text_color, text_halign, text_valign, text_wrap, text_font_family, force_overlay, text_formatting) → series box
box.new(left, top, right, bottom, border_color, border_width, border_style, extend, xloc, bgcolor, text, text_size, text_color, text_halign, text_valign, text_wrap, text_font_family, force_overlay, text_formatting) → series box
box.set_bgcolor(id, color) → void
box.set_border_color(id, color) → void
box.set_border_style(id, style) → void
box.set_border_width(id, width) → void
box.set_bottom(id, bottom) → void
box.set_bottom_right_point(id, point) → void
box.set_extend(id, extend) → void
box.set_left(id, left) → void
box.set_lefttop(id, left, top) → void
box.set_right(id, right) → void
box.set_rightbottom(id, right, bottom) → void
box.set_text(id, text) → void
box.set_text_color(id, text_color) → void
box.set_text_font_family(id, text_font_family) → void
box.set_text_formatting(id, text_formatting) → void
box.set_text_halign(id, text_halign) → void
box.set_text_size(id, text_size) → void
box.set_text_valign(id, text_valign) → void
box.set_text_wrap(id, text_wrap) → void
box.set_top(id, top) → void
box.set_top_left_point(id, point) → void
box.set_xloc(id, left, right, xloc) → void
chart.point.copy(id) → chart.point
chart.point.from_index(index, price) → chart.point
chart.point.from_time(time, price) → chart.point
chart.point.new(time, index, price) → chart.point
chart.point.now(price) → chart.point
color(x) → const color
color(x) → input color
color(x) → simple color
color(x) → series color
color.b(color) → const float
color.b(color) → input float
color.b(color) → simple float
color.b(color) → series float
color.from_gradient(value, bottom_value, top_value, bottom_color, top_color) → series color
color.g(color) → const float
color.g(color) → input float
color.g(color) → simple float
color.g(color) → series float
color.new(color, transp) → const color
color.new(color, transp) → input color
color.new(color, transp) → simple color
color.new(color, transp) → series color
color.r(color) → const float
color.r(color) → input float
color.r(color) → simple float
color.r(color) → series float
color.rgb(red, green, blue, transp) → const color
color.rgb(red, green, blue, transp) → input color
color.rgb(red, green, blue, transp) → simple color
color.rgb(red, green, blue, transp) → series color
color.t(color) → const float
color.t(color) → input float
color.t(color) → simple float
color.t(color) → series float
dayofmonth(time, timezone) → series int
dayofweek(time, timezone) → series int
fill(hline1, hline2, color, title, editable, fillgaps, display) → void
fill(plot1, plot2, color, title, editable, show_last, fillgaps, display) → void
fill(plot1, plot2, top_value, bottom_value, top_color, bottom_color, title, display, fillgaps, editable) → void
fixnan(source) → series color
fixnan(source) → series int
fixnan(source) → series float
float(x) → const float
float(x) → input float
float(x) → simple float
float(x) → series float
footprint.buy_volume(id) → series float
footprint.delta(id) → series float
footprint.get_row_by_price(id, price) → volume_row
footprint.poc(id) → volume_row
footprint.rows(id) → array<volume_row>
footprint.sell_volume(id) → series float
footprint.total_volume(id) → series float
footprint.vah(id) → volume_row
footprint.val(id) → volume_row
hline(price, title, color, linestyle, linewidth, editable, display) → hline
hour(time, timezone) → series int
indicator(title, shorttitle, overlay, format, precision, scale, max_bars_back, timeframe, timeframe_gaps, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, max_polylines_count, dynamic_requests, behind_chart) → void
input(defval, title, tooltip, inline, group, display, active) → input color
input(defval, title, tooltip, inline, group, display, active) → input string
input(defval, title, tooltip, inline, group, display, active) → input int
input(defval, title, tooltip, inline, group, display, active) → input float
input(defval, title, inline, group, tooltip, display, active) → series float
input(defval, title, tooltip, inline, group, display, active) → input bool
input.bool(defval, title, tooltip, inline, group, confirm, display, active) → input bool
input.color(defval, title, tooltip, inline, group, confirm, display, active) → input color
input.enum(defval, title, options, tooltip, inline, group, confirm, display, active) → input enum
input.float(defval, title, options, tooltip, inline, group, confirm, display, active) → input float
input.float(defval, title, minval, maxval, step, tooltip, inline, group, confirm, display, active) → input float
input.int(defval, title, options, tooltip, inline, group, confirm, display, active) → input int
input.int(defval, title, minval, maxval, step, tooltip, inline, group, confirm, display, active) → input int
input.price(defval, title, tooltip, inline, group, confirm, display, active) → input float
input.session(defval, title, options, tooltip, inline, group, confirm, display, active) → input string
input.source(defval, title, tooltip, inline, group, display, active, confirm) → series float
input.string(defval, title, options, tooltip, inline, group, confirm, display, active) → input string
input.symbol(defval, title, tooltip, inline, group, confirm, display, active) → input string
input.text_area(defval, title, tooltip, group, confirm, display, active) → input string
input.time(defval, title, tooltip, inline, group, confirm, display, active) → input int
input.timeframe(defval, title, options, tooltip, inline, group, confirm, display, active) → input string
int(x) → const int
int(x) → input int
int(x) → simple int
int(x) → series int
label(x) → series label
label.copy(id) → series label
label.delete(id) → void
label.get_text(id) → series string
label.get_x(id) → series int
label.get_y(id) → series float
label.new(point, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip, text_font_family, force_overlay, text_formatting) → series label
label.new(x, y, text, xloc, yloc, color, style, textcolor, size, textalign, tooltip, text_font_family, force_overlay, text_formatting) → series label
label.set_color(id, color) → void
label.set_point(id, point) → void
label.set_size(id, size) → void
label.set_style(id, style) → void
label.set_text(id, text) → void
label.set_text_font_family(id, text_font_family) → void
label.set_text_formatting(id, text_formatting) → void
label.set_textalign(id, textalign) → void
label.set_textcolor(id, textcolor) → void
label.set_tooltip(id, tooltip) → void
label.set_x(id, x) → void
label.set_xloc(id, x, xloc) → void
label.set_xy(id, x, y) → void
label.set_y(id, y) → void
label.set_yloc(id, yloc) → void
library(title, overlay, dynamic_requests) → void
line(x) → series line
line.copy(id) → series line
line.delete(id) → void
line.get_price(id, x) → series float
line.get_x1(id) → series int
line.get_x2(id) → series int
line.get_y1(id) → series float
line.get_y2(id) → series float
line.new(first_point, second_point, xloc, extend, color, style, width, force_overlay) → series line
line.new(x1, y1, x2, y2, xloc, extend, color, style, width, force_overlay) → series line
line.set_color(id, color) → void
line.set_extend(id, extend) → void
line.set_first_point(id, point) → void
line.set_second_point(id, point) → void
line.set_style(id, style) → void
line.set_width(id, width) → void
line.set_x1(id, x) → void
line.set_x2(id, x) → void
line.set_xloc(id, x1, x2, xloc) → void
line.set_xy1(id, x, y) → void
line.set_xy2(id, x, y) → void
line.set_y1(id, y) → void
line.set_y2(id, y) → void
linefill(x) → series linefill
linefill.delete(id) → void
linefill.get_line1(id) → series line
linefill.get_line2(id) → series line
linefill.new(line1, line2, color) → series linefill
linefill.set_color(id, color) → void
log.error(message) → void
log.error(formatString, arg0, arg1, ...) → void
log.info(message) → void
log.info(formatString, arg0, arg1, ...) → void
log.warning(message) → void
log.warning(formatString, arg0, arg1, ...) → void
map.clear(id) → void
map.contains(id, key) → series bool
map.copy(id) → map<keyType, valueType>
map.get(id, key) → <value_type>
map.keys(id) → array<type>
map.new<keyType, valueType>() → map<keyType, valueType>
map.put(id, key, value) → <value_type>
map.put_all(id, id2) → void
map.remove(id, key) → <value_type>
map.size(id) → series int
map.values(id) → array<type>
math.abs(number) → const int
math.abs(number) → input int
math.abs(number) → const float
math.abs(number) → simple int
math.abs(number) → input float
math.abs(number) → series int
math.abs(number) → simple float
math.abs(number) → series float
math.acos(angle) → const float
math.acos(angle) → input float
math.acos(angle) → simple float
math.acos(angle) → series float
math.asin(angle) → const float
math.asin(angle) → input float
math.asin(angle) → simple float
math.asin(angle) → series float
math.atan(angle) → const float
math.atan(angle) → input float
math.atan(angle) → simple float
math.atan(angle) → series float
math.avg(number0, number1, ...) → simple float
math.avg(number0, number1, ...) → series float
math.ceil(number) → const int
math.ceil(number) → input int
math.ceil(number) → simple int
math.ceil(number) → series int
math.cos(angle) → const float
math.cos(angle) → input float
math.cos(angle) → simple float
math.cos(angle) → series float
math.exp(number) → const float
math.exp(number) → input float
math.exp(number) → simple float
math.exp(number) → series float
math.floor(number) → const int
math.floor(number) → input int
math.floor(number) → simple int
math.floor(number) → series int
math.log(number) → const float
math.log(number) → input float
math.log(number) → simple float
math.log(number) → series float
math.log10(number) → const float
math.log10(number) → input float
math.log10(number) → simple float
math.log10(number) → series float
math.max(number0, number1, ...) → const int
math.max(number0, number1, ...) → const float
math.max(number0, number1, ...) → input int
math.max(number0, number1, ...) → simple int
math.max(number0, number1, ...) → input float
math.max(number0, number1, ...) → series int
math.max(number0, number1, ...) → simple float
math.max(number0, number1, ...) → series float
math.min(number0, number1, ...) → const int
math.min(number0, number1, ...) → const float
math.min(number0, number1, ...) → input int
math.min(number0, number1, ...) → simple int
math.min(number0, number1, ...) → input float
math.min(number0, number1, ...) → series int
math.min(number0, number1, ...) → simple float
math.min(number0, number1, ...) → series float
math.pow(base, exponent) → const float
math.pow(base, exponent) → input float
math.pow(base, exponent) → simple float
math.pow(base, exponent) → series float
math.random(min, max, seed) → series float
math.round(number) → const int
math.round(number) → input int
math.round(number) → simple int
math.round(number) → series int
math.round(number, precision) → const float
math.round(number, precision) → input float
math.round(number, precision) → simple float
math.round(number, precision) → series float
math.round_to_mintick(number) → simple float
math.round_to_mintick(number) → series float
math.sign(number) → const float
math.sign(number) → input float
math.sign(number) → simple float
math.sign(number) → series float
math.sin(angle) → const float
math.sin(angle) → input float
math.sin(angle) → simple float
math.sin(angle) → series float
math.sqrt(number) → const float
math.sqrt(number) → input float
math.sqrt(number) → simple float
math.sqrt(number) → series float
math.sum(source, length) → series float
math.tan(angle) → const float
math.tan(angle) → input float
math.tan(angle) → simple float
math.tan(angle) → series float
math.todegrees(radians) → series float
math.toradians(degrees) → series float
matrix.add_col(id, column, array_id) → void
matrix.add_row(id, row, array_id) → void
matrix.avg(id) → series float
matrix.avg(id) → series int
matrix.col(id, column) → array<type>
matrix.columns(id) → series int
matrix.concat(id1, id2) → matrix<type>
matrix.copy(id) → matrix<type>
matrix.det(id) → series float
matrix.det(id) → series int
matrix.diff(id1, id2) → matrix<int>
matrix.diff(id1, id2) → matrix<float>
matrix.eigenvalues(id) → array<float>
matrix.eigenvalues(id) → array<int>
matrix.eigenvectors(id) → matrix<float>
matrix.eigenvectors(id) → matrix<int>
matrix.elements_count(id) → series int
matrix.fill(id, value, from_row, to_row, from_column, to_column) → void
matrix.get(id, row, column) → <matrix_type>
matrix.inv(id) → matrix<float>
matrix.inv(id) → matrix<int>
matrix.is_antidiagonal(id) → series bool
matrix.is_antisymmetric(id) → series bool
matrix.is_binary(id) → series bool
matrix.is_diagonal(id) → series bool
matrix.is_identity(id) → series bool
matrix.is_square(id) → series bool
matrix.is_stochastic(id) → series bool
matrix.is_symmetric(id) → series bool
matrix.is_triangular(id) → series bool
matrix.is_zero(id) → series bool
matrix.kron(id1, id2) → matrix<float>
matrix.kron(id1, id2) → matrix<int>
matrix.max(id) → series float
matrix.max(id) → series int
matrix.median(id) → series float
matrix.median(id) → series int
matrix.min(id) → series float
matrix.min(id) → series int
matrix.mode(id) → series float
matrix.mode(id) → series int
matrix.mult(id1, id2) → array<int>
matrix.mult(id1, id2) → array<float>
matrix.mult(id1, id2) → matrix<int>
matrix.mult(id1, id2) → matrix<float>
matrix.new<type>(rows, columns, initial_value) → matrix<type>
matrix.pinv(id) → matrix<float>
matrix.pinv(id) → matrix<int>
matrix.pow(id, power) → matrix<float>
matrix.pow(id, power) → matrix<int>
matrix.rank(id) → series int
matrix.remove_col(id, column) → array<type>
matrix.remove_row(id, row) → array<type>
matrix.reshape(id, rows, columns) → void
matrix.reverse(id) → void
matrix.row(id, row) → array<type>
matrix.rows(id) → series int
matrix.set(id, row, column, value) → void
matrix.sort(id, column, order) → void
matrix.sort(id, column, order, sort_field) → void
matrix.submatrix(id, from_row, to_row, from_column, to_column) → matrix<type>
matrix.sum(id1, id2) → matrix<int>
matrix.sum(id1, id2) → matrix<float>
matrix.swap_columns(id, column1, column2) → void
matrix.swap_rows(id, row1, row2) → void
matrix.trace(id) → series float
matrix.trace(id) → series int
matrix.transpose(id) → matrix<type>
max_bars_back(var, num) → void
minute(time, timezone) → series int
month(time, timezone) → series int
na(x) → simple bool
na(x) → series bool
nz(source, replacement) → simple color
nz(source, replacement) → simple int
nz(source, replacement) → series color
nz(source, replacement) → series int
nz(source, replacement) → simple float
nz(source, replacement) → series float
plot(series, title, color, linewidth, style, trackprice, histbase, offset, join, editable, show_last, display, format, precision, force_overlay, linestyle) → plot
plotarrow(series, title, colorup, colordown, offset, minheight, maxheight, editable, show_last, display, format, precision, force_overlay) → void
plotbar(open, high, low, close, title, color, editable, show_last, display, format, precision, force_overlay) → void
plotcandle(open, high, low, close, title, color, wickcolor, editable, show_last, bordercolor, display, format, precision, force_overlay) → void
plotchar(series, title, char, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void
plotshape(series, title, style, location, color, offset, text, textcolor, editable, size, show_last, display, format, precision, force_overlay) → void
polyline.delete(id) → void
polyline.new(points, curved, closed, xloc, line_color, fill_color, line_style, line_width, force_overlay) → series polyline
request.currency_rate(from, to, ignore_invalid_currency) → series float
request.dividends(ticker, field, gaps, lookahead, ignore_invalid_symbol, currency) → series float
request.earnings(ticker, field, gaps, lookahead, ignore_invalid_symbol, currency) → series float
request.economic(country_code, field, gaps, ignore_invalid_symbol) → series float
request.financial(symbol, financial_id, period, gaps, ignore_invalid_symbol, currency) → series float
request.footprint(ticks_per_row, va_percent, imbalance_percent) → footprint
request.quandl(ticker, gaps, index, ignore_invalid_symbol) → series float
request.security(symbol, timeframe, expression, gaps, lookahead, ignore_invalid_symbol, currency, calc_bars_count) → series <type>
request.security_lower_tf(symbol, timeframe, expression, ignore_invalid_symbol, currency, ignore_invalid_timeframe, calc_bars_count) → array<type>
request.seed(source, symbol, expression, ignore_invalid_symbol, calc_bars_count) → series <type>
request.splits(ticker, field, gaps, lookahead, ignore_invalid_symbol) → series float
runtime.error(message) → void
second(time, timezone) → series int
str.contains(source, str) → const bool
str.contains(source, str) → simple bool
str.contains(source, str) → series bool
str.endswith(source, str) → const bool
str.endswith(source, str) → simple bool
str.endswith(source, str) → series bool
str.format(formatString, arg0, arg1, ...) → simple string
str.format(formatString, arg0, arg1, ...) → series string
str.format_time(time, format, timezone) → series string
str.length(string) → const int
str.length(string) → simple int
str.length(string) → series int
str.lower(source) → const string
str.lower(source) → simple string
str.lower(source) → series string
str.match(source, regex) → simple string
str.match(source, regex) → series string
str.pos(source, str) → const int
str.pos(source, str) → simple int
str.pos(source, str) → series int
str.repeat(source, repeat, separator) → const string
str.repeat(source, repeat, separator) → input string
str.repeat(source, repeat, separator) → simple string
str.repeat(source, repeat, separator) → series string
str.replace(source, target, replacement, occurrence) → const string
str.replace(source, target, replacement, occurrence) → simple string
str.replace(source, target, replacement, occurrence) → series string
str.replace_all(source, target, replacement) → simple string
str.replace_all(source, target, replacement) → series string
str.split(string, separator) → array<string>
str.startswith(source, str) → const bool
str.startswith(source, str) → simple bool
str.startswith(source, str) → series bool
str.substring(source, begin_pos, end_pos) → const string
str.substring(source, begin_pos, end_pos) → simple string
str.substring(source, begin_pos, end_pos) → series string
str.tonumber(string) → const float
str.tonumber(string) → input float
str.tonumber(string) → simple float
str.tonumber(string) → series float
str.tostring(value) → const string
str.tostring(value, format) → simple string
str.tostring(value, format) → series string
str.tostring(value) → simple string
str.tostring(value) → series string
str.trim(source) → const string
str.trim(source) → input string
str.trim(source) → simple string
str.trim(source) → series string
str.upper(source) → const string
str.upper(source) → simple string
str.upper(source) → series string
strategy(title, shorttitle, overlay, format, precision, scale, pyramiding, calc_on_order_fills, calc_on_every_tick, max_bars_back, backtest_fill_limits_assumption, default_qty_type, default_qty_value, initial_capital, currency, slippage, commission_type, commission_value, process_orders_on_close, close_entries_rule, margin_long, margin_short, explicit_plot_zorder, max_lines_count, max_labels_count, max_boxes_count, calc_bars_count, risk_free_rate, use_bar_magnifier, fill_orders_on_standard_ohlc, max_polylines_count, dynamic_requests, behind_chart, calc_on_every_history_tick) → void
strategy.cancel(id) → void
strategy.cancel_all() → void
strategy.close(id, comment, qty, qty_percent, alert_message, immediately, disable_alert) → void
strategy.close_all(comment, alert_message, immediately, disable_alert) → void
strategy.closedtrades.commission(trade_num) → series float
strategy.closedtrades.entry_bar_index(trade_num) → series int
strategy.closedtrades.entry_comment(trade_num) → series string
strategy.closedtrades.entry_id(trade_num) → series string
strategy.closedtrades.entry_price(trade_num) → series float
strategy.closedtrades.entry_time(trade_num) → series int
strategy.closedtrades.exit_bar_index(trade_num) → series int
strategy.closedtrades.exit_comment(trade_num) → series string
strategy.closedtrades.exit_id(trade_num) → series string
strategy.closedtrades.exit_price(trade_num) → series float
strategy.closedtrades.exit_time(trade_num) → series int
strategy.closedtrades.max_drawdown(trade_num) → series float
strategy.closedtrades.max_drawdown_percent(trade_num) → series float
strategy.closedtrades.max_runup(trade_num) → series float
strategy.closedtrades.max_runup_percent(trade_num) → series float
strategy.closedtrades.profit(trade_num) → series float
strategy.closedtrades.profit_percent(trade_num) → series float
strategy.closedtrades.size(trade_num) → series float
strategy.convert_to_account(value) → series float
strategy.convert_to_symbol(value) → series float
strategy.default_entry_qty(fill_price) → series float
strategy.entry(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void
strategy.exit(id, from_entry, qty, qty_percent, profit, limit, loss, stop, trail_price, trail_points, trail_offset, oca_name, comment, comment_profit, comment_loss, comment_trailing, alert_message, alert_profit, alert_loss, alert_trailing, disable_alert) → void
strategy.opentrades.commission(trade_num) → series float
strategy.opentrades.entry_bar_index(trade_num) → series int
strategy.opentrades.entry_comment(trade_num) → series string
strategy.opentrades.entry_id(trade_num) → series string
strategy.opentrades.entry_price(trade_num) → series float
strategy.opentrades.entry_time(trade_num) → series int
strategy.opentrades.max_drawdown(trade_num) → series float
strategy.opentrades.max_drawdown_percent(trade_num) → series float
strategy.opentrades.max_runup(trade_num) → series float
strategy.opentrades.max_runup_percent(trade_num) → series float
strategy.opentrades.profit(trade_num) → series float
strategy.opentrades.profit_percent(trade_num) → series float
strategy.opentrades.size(trade_num) → series float
strategy.order(id, direction, qty, limit, stop, oca_name, oca_type, comment, alert_message, disable_alert) → void
strategy.risk.allow_entry_in(value) → void
strategy.risk.max_cons_loss_days(count, alert_message) → void
strategy.risk.max_drawdown(value, type, alert_message) → void
strategy.risk.max_intraday_filled_orders(count, alert_message) → void
strategy.risk.max_intraday_loss(value, type, alert_message) → void
strategy.risk.max_position_size(contracts) → void
string(x) → const string
string(x) → input string
string(x) → simple string
string(x) → series string
syminfo.prefix(symbol) → simple string
syminfo.prefix(symbol) → series string
syminfo.ticker(symbol) → simple string
syminfo.ticker(symbol) → series string
ta.alma(series, length, offset, sigma, floor) → series float
ta.atr(length) → series float
ta.barssince(condition) → series int
ta.bb(series, length, mult) → [series float, series float, series float]
ta.bbw(series, length, mult) → series float
ta.cci(source, length) → series float
ta.change(source, length) → series int
ta.change(source, length) → series float
ta.change(source, length) → series bool
ta.cmo(series, length) → series float
ta.cog(source, length) → series float
ta.correlation(source1, source2, length) → series float
ta.cross(source1, source2) → series bool
ta.crossover(source1, source2) → series bool
ta.crossunder(source1, source2) → series bool
ta.cum(source) → series float
ta.dev(source, length) → series float
ta.dmi(diLength, adxSmoothing) → [series float, series float, series float]
ta.ema(source, length) → series float
ta.falling(source, length) → series bool
ta.highest(source, length) → series float
ta.highestbars(source, length) → series int
ta.hma(source, length) → series float
ta.kc(series, length, mult, useTrueRange) → [series float, series float, series float]
ta.kcw(series, length, mult, useTrueRange) → series float
ta.linreg(source, length, offset) → series float
ta.lowest(source, length) → series float
ta.lowestbars(source, length) → series int
ta.macd(source, fastlen, slowlen, siglen) → [series float, series float, series float]
ta.max(source) → series float
ta.median(source, length) → series int
ta.median(source, length) → series float
ta.mfi(series, length) → series float
ta.min(source) → series float
ta.mode(source, length) → series int
ta.mode(source, length) → series float
ta.mom(source, length) → series float
ta.percentile_linear_interpolation(source, length, percentage) → series float
ta.percentile_nearest_rank(source, length, percentage) → series float
ta.percentrank(source, length) → series float
ta.pivot_point_levels(type, anchor, developing) → array<float>
ta.pivothigh(leftbars, rightbars) → series float
ta.pivothigh(source, leftbars, rightbars) → series float
ta.pivotlow(leftbars, rightbars) → series float
ta.pivotlow(source, leftbars, rightbars) → series float
ta.range(source, length) → series int
ta.range(source, length) → series float
ta.rci(source, length) → series float
ta.rising(source, length) → series bool
ta.rma(source, length) → series float
ta.roc(source, length) → series float
ta.rsi(source, length) → series float
ta.sar(start, inc, max) → series float
ta.sma(source, length) → series float
ta.stdev(source, length, biased) → series float
ta.stoch(source, high, low, length) → series float
ta.supertrend(factor, atrPeriod) → [series float, series float]
ta.swma(source) → series float
ta.tr(handle_na) → series float
ta.tsi(source, short_length, long_length) → series float
ta.valuewhen(condition, source, occurrence) → series color
ta.valuewhen(condition, source, occurrence) → series int
ta.valuewhen(condition, source, occurrence) → series float
ta.valuewhen(condition, source, occurrence) → series bool
ta.variance(source, length, biased) → series float
ta.vwap(source, anchor) → series float
ta.vwap(source, anchor, stdev_mult) → [series float, series float, series float]
ta.vwma(source, length) → series float
ta.wma(source, length) → series float
ta.wpr(length) → series float
table(x) → series table
table.cell(table_id, column, row, text, width, height, text_color, text_halign, text_valign, text_size, bgcolor, tooltip, text_font_family, text_formatting) → void
table.cell_set_bgcolor(table_id, column, row, bgcolor) → void
table.cell_set_height(table_id, column, row, height) → void
table.cell_set_text(table_id, column, row, text) → void
table.cell_set_text_color(table_id, column, row, text_color) → void
table.cell_set_text_font_family(table_id, column, row, text_font_family) → void
table.cell_set_text_formatting(table_id, column, row, text_formatting) → void
table.cell_set_text_halign(table_id, column, row, text_halign) → void
table.cell_set_text_size(table_id, column, row, text_size) → void
table.cell_set_text_valign(table_id, column, row, text_valign) → void
table.cell_set_tooltip(table_id, column, row, tooltip) → void
table.cell_set_width(table_id, column, row, width) → void
table.clear(table_id, start_column, start_row, end_column, end_row) → void
table.delete(table_id) → void
table.merge_cells(table_id, start_column, start_row, end_column, end_row) → void
table.new(position, columns, rows, bgcolor, frame_color, frame_width, border_color, border_width, force_overlay) → series table
table.set_bgcolor(table_id, bgcolor) → void
table.set_border_color(table_id, border_color) → void
table.set_border_width(table_id, border_width) → void
table.set_frame_color(table_id, frame_color) → void
table.set_frame_width(table_id, frame_width) → void
table.set_position(table_id, position) → void
ticker.heikinashi(symbol) → simple string
ticker.heikinashi(symbol) → series string
ticker.inherit(from_tickerid, symbol) → simple string
ticker.inherit(from_tickerid, symbol) → series string
ticker.kagi(symbol, reversal) → simple string
ticker.kagi(symbol, reversal) → series string
ticker.kagi(symbol, param, style) → simple string
ticker.kagi(symbol, param, style) → series string
ticker.linebreak(symbol, number_of_lines) → simple string
ticker.linebreak(symbol, number_of_lines) → series string
ticker.modify(tickerid, session, adjustment, backadjustment, settlement_as_close) → simple string
ticker.modify(tickerid, session, adjustment, backadjustment, settlement_as_close) → series string
ticker.new(prefix, ticker, session, adjustment, backadjustment, settlement_as_close) → simple string
ticker.new(prefix, ticker, session, adjustment, backadjustment, settlement_as_close) → series string
ticker.pointfigure(symbol, source, style, param, reversal) → simple string
ticker.pointfigure(symbol, source, style, param, reversal) → series string
ticker.renko(symbol, style, param, request_wicks, source) → simple string
ticker.renko(symbol, style, param, request_wicks, source) → series string
ticker.standard(symbol) → simple string
ticker.standard(symbol) → series string
time(timeframe, session, bars_back, timeframe_bars_back) → series int
time(timeframe, session, timezone, bars_back, timeframe_bars_back) → series int
time_close(timeframe, session, bars_back, timeframe_bars_back) → series int
time_close(timeframe, session, timezone, bars_back, timeframe_bars_back) → series int
timeframe.change(timeframe) → series bool
timeframe.from_seconds(seconds) → simple string
timeframe.from_seconds(seconds) → series string
timeframe.in_seconds(timeframe) → simple int
timeframe.in_seconds(timeframe) → series int
timestamp(dateString) → const int
timestamp(dateString) → series int
timestamp(year, month, day, hour, minute, second) → simple int
timestamp(year, month, day, hour, minute, second) → series int
timestamp(timezone, year, month, day, hour, minute, second) → simple int
timestamp(timezone, year, month, day, hour, minute, second) → series int
volume_row.buy_volume(id) → series float
volume_row.delta(id) → series float
volume_row.down_price(id) → series float
volume_row.has_buy_imbalance(id) → series bool
volume_row.has_sell_imbalance(id) → series bool
volume_row.sell_volume(id) → series float
volume_row.total_volume(id) → series float
volume_row.up_price(id) → series float
weekofyear(time, timezone) → series int
year(time, timezone) → series int

PINE SCRIPT v6 — BUILT-IN VARIABLES AND CONSTANTS (398)
ask : series float
bar_index : series int
barstate.isconfirmed : series bool
barstate.isfirst : series bool
barstate.ishistory : series bool
barstate.islast : series bool
barstate.islastconfirmedhistory : series bool
barstate.isnew : series bool
barstate.isrealtime : series bool
bid : series float
box.all : array<box>
chart.bg_color : input color
chart.fg_color : input color
chart.is_heikinashi : simple bool
chart.is_kagi : simple bool
chart.is_linebreak : simple bool
chart.is_pnf : simple bool
chart.is_range : simple bool
chart.is_renko : simple bool
chart.is_standard : simple bool
chart.left_visible_bar_time : input int
chart.right_visible_bar_time : input int
close : series float
dayofmonth : series int
dayofweek : series int
dividends.future_amount : series float
dividends.future_ex_date : series int
dividends.future_pay_date : series int
earnings.future_eps : series float
earnings.future_period_end_time : series int
earnings.future_revenue : series float
earnings.future_time : series int
high : series float
hl2 : series float
hlc3 : series float
hlcc4 : series float
hour : series int
label.all : array<label>
last_bar_index : series int
last_bar_time : series int
line.all : array<line>
linefill.all : array<linefill>
low : series float
minute : series int
month : series int
na : simple na
ohlc4 : series float
open : series float
polyline.all : array<polyline>
second : series int
session.isfirstbar : series bool
session.isfirstbar_regular : series bool
session.islastbar : series bool
session.islastbar_regular : series bool
session.ismarket : series bool
session.ispostmarket : series bool
session.ispremarket : series bool
strategy.account_currency : simple string
strategy.avg_losing_trade : series float
strategy.avg_losing_trade_percent : series float
strategy.avg_trade : series float
strategy.avg_trade_percent : series float
strategy.avg_winning_trade : series float
strategy.avg_winning_trade_percent : series float
strategy.closedtrades : series int
strategy.closedtrades.first_index : series int
strategy.equity : series float
strategy.eventrades : series int
strategy.grossloss : series float
strategy.grossloss_percent : series float
strategy.grossprofit : series float
strategy.grossprofit_percent : series float
strategy.initial_capital : series float
strategy.losstrades : series int
strategy.margin_liquidation_price : series float
strategy.max_contracts_held_all : series float
strategy.max_contracts_held_long : series float
strategy.max_contracts_held_short : series float
strategy.max_drawdown : series float
strategy.max_drawdown_percent : series float
strategy.max_runup : series float
strategy.max_runup_percent : series float
strategy.netprofit : series float
strategy.netprofit_percent : series float
strategy.openprofit : series float
strategy.openprofit_percent : series float
strategy.opentrades : series int
strategy.opentrades.capital_held : series float
strategy.position_avg_price : series float
strategy.position_entry_name : series string
strategy.position_size : series float
strategy.wintrades : series int
syminfo.basecurrency : simple string
syminfo.country : simple string
syminfo.currency : simple string
syminfo.current_contract : simple string
syminfo.description : simple string
syminfo.employees : simple int
syminfo.expiration_date : simple int
syminfo.industry : simple string
syminfo.isin : simple string
syminfo.main_tickerid : simple string
syminfo.mincontract : simple float
syminfo.minmove : simple int
syminfo.mintick : simple float
syminfo.pointvalue : simple float
syminfo.prefix : simple string
syminfo.pricescale : simple int
syminfo.recommendations_buy : series int
syminfo.recommendations_buy_strong : series int
syminfo.recommendations_date : series int
syminfo.recommendations_hold : series int
syminfo.recommendations_sell : series int
syminfo.recommendations_sell_strong : series int
syminfo.recommendations_total : series int
syminfo.root : simple string
syminfo.sector : simple string
syminfo.session : simple string
syminfo.shareholders : simple int
syminfo.shares_outstanding_float : simple float
syminfo.shares_outstanding_total : simple int
syminfo.target_price_average : series float
syminfo.target_price_date : series int
syminfo.target_price_estimates : series float
syminfo.target_price_high : series float
syminfo.target_price_low : series float
syminfo.target_price_median : series float
syminfo.ticker : simple string
syminfo.tickerid : simple string
syminfo.timezone : simple string
syminfo.type : simple string
syminfo.volumetype : simple string
ta.accdist : series float
ta.iii : series float
ta.nvi : series float
ta.obv : series float
ta.pvi : series float
ta.pvt : series float
ta.tr : series float
ta.vwap : series float
ta.wad : series float
ta.wvad : series float
table.all : array<table>
time : series int
time_close : series int
time_tradingday : series int
timeframe.isdaily : simple bool
timeframe.isdwm : simple bool
timeframe.isintraday : simple bool
timeframe.isminutes : simple bool
timeframe.ismonthly : simple bool
timeframe.isseconds : simple bool
timeframe.isticks : simple bool
timeframe.isweekly : simple bool
timeframe.main_period : simple string
timeframe.multiplier : simple int
timeframe.period : simple string
timenow : series int
volume : series float
weekofyear : series int
year : series int
adjustment.dividends : const string
adjustment.none : const string
adjustment.splits : const string
alert.freq_all : const string
alert.freq_once_per_bar : const string
alert.freq_once_per_bar_close : const string
backadjustment.inherit : const backadjustment
backadjustment.off : const backadjustment
backadjustment.on : const backadjustment
barmerge.gaps_off : const barmerge_gaps
barmerge.gaps_on : const barmerge_gaps
barmerge.lookahead_off : const barmerge_lookahead
barmerge.lookahead_on : const barmerge_lookahead
color.aqua : const color
color.black : const color
color.blue : const color
color.fuchsia : const color
color.gray : const color
color.green : const color
color.lime : const color
color.maroon : const color
color.navy : const color
color.olive : const color
color.orange : const color
color.purple : const color
color.red : const color
color.silver : const color
color.teal : const color
color.white : const color
color.yellow : const color
currency.AED : const string
currency.ARS : const string
currency.AUD : const string
currency.BDT : const string
currency.BHD : const string
currency.BRL : const string
Bitcoin. : const string
currency.CAD : const string
currency.CHF : const string
currency.CLP : const string
currency.CNY : const string
currency.COP : const string
currency.CZK : const string
currency.DKK : const string
currency.EGP : const string
Ethereum. : const string
Euro. : const string
currency.GBP : const string
currency.HKD : const string
currency.HUF : const string
currency.IDR : const string
currency.ILS : const string
currency.INR : const string
currency.ISK : const string
currency.JPY : const string
currency.KES : const string
currency.KRW : const string
currency.KWD : const string
currency.LKR : const string
currency.MAD : const string
currency.MXN : const string
currency.MYR : const string
currency.NGN : const string
currency.NOK : const string
currency.NONE : const string
currency.NZD : const string
currency.PEN : const string
currency.PHP : const string
currency.PKR : const string
currency.PLN : const string
currency.QAR : const string
currency.RON : const string
currency.RSD : const string
currency.RUB : const string
currency.SAR : const string
currency.SEK : const string
currency.SGD : const string
currency.THB : const string
currency.TND : const string
currency.TRY : const string
currency.TWD : const string
currency.USD : const string
Tether. : const string
currency.VES : const string
currency.VND : const string
currency.ZAR : const string
dayofweek.friday : const int
dayofweek.monday : const int
dayofweek.saturday : const int
dayofweek.sunday : const int
dayofweek.thursday : const int
dayofweek.tuesday : const int
dayofweek.wednesday : const int
display.all : const plot_simple_display
display.data_window : const plot_display
display.none : const plot_simple_display
display.pane : const plot_display
display.pine_screener : const plot_display
display.price_scale : const plot_display
display.status_line : const plot_display
dividends.gross : const string
dividends.net : const string
earnings.actual : const string
earnings.estimate : const string
earnings.standardized : const string
extend.both : const string
extend.left : const string
extend.none : const string
extend.right : const string
font.family_default : const string
font.family_monospace : const string
format.inherit : const string
format.mintick : const string
format.percent : const string
format.price : const string
format.volume : const string
hline.style_dashed : const hline_style
hline.style_dotted : const hline_style
hline.style_solid : const hline_style
label.style_arrowdown : const string
label.style_arrowup : const string
label.style_circle : const string
label.style_cross : const string
label.style_diamond : const string
label.style_flag : const string
label.style_label_center : const string
label.style_label_down : const string
label.style_label_left : const string
label.style_label_lower_left : const string
label.style_label_lower_right : const string
label.style_label_right : const string
label.style_label_up : const string
label.style_label_upper_left : const string
label.style_label_upper_right : const string
label.style_none : const string
label.style_square : const string
label.style_text_outline : const string
label.style_triangledown : const string
label.style_triangleup : const string
label.style_xcross : const string
line.style_arrow_both : const string
line.style_arrow_left : const string
line.style_arrow_right : const string
line.style_dashed : const string
line.style_dotted : const string
line.style_solid : const string
location.abovebar : const string
location.absolute : const string
location.belowbar : const string
location.bottom : const string
location.top : const string
math.e : const float
math.phi : const float
math.pi : const float
math.rphi : const float
order.ascending : const sort_order
order.descending : const sort_order
plot.linestyle_dashed : const plot_line_style
plot.linestyle_dotted : const plot_line_style
plot.linestyle_solid : const plot_line_style
plot.style_area : const plot_style
plot.style_areabr : const plot_style
plot.style_circles : const plot_style
plot.style_columns : const plot_style
plot.style_cross : const plot_style
plot.style_histogram : const plot_style
plot.style_line : const plot_style
plot.style_linebr : const plot_style
plot.style_stepline : const plot_style
plot.style_stepline_diamond : const plot_style
plot.style_steplinebr : const plot_style
position.bottom_center : const string
position.bottom_left : const string
position.bottom_right : const string
position.middle_center : const string
position.middle_left : const string
position.middle_right : const string
position.top_center : const string
position.top_left : const string
position.top_right : const string
scale.left : const scale_type
scale.none : const scale_type
scale.right : const scale_type
session.extended : const string
session.regular : const string
settlement_as_close.inherit : const settlement
settlement_as_close.off : const settlement
settlement_as_close.on : const settlement
shape.arrowdown : const string
shape.arrowup : const string
shape.circle : const string
shape.cross : const string
shape.diamond : const string
shape.flag : const string
shape.labeldown : const string
shape.labelup : const string
shape.square : const string
shape.triangledown : const string
shape.triangleup : const string
shape.xcross : const string
size.auto : const string
size.huge : const string
size.large : const string
size.normal : const string
size.small : const string
size.tiny : const string
splits.denominator : const string
splits.numerator : const string
strategy.cash : const string
strategy.commission.cash_per_contract : const string
strategy.commission.cash_per_order : const string
strategy.commission.percent : const string
strategy.direction.all : const string
strategy.direction.long : const string
strategy.direction.short : const string
strategy.fixed : const string
strategy.long : const strategy_direction
strategy.oca.cancel : const string
strategy.oca.none : const string
strategy.oca.reduce : const string
strategy.percent_of_equity : const string
strategy.short : const strategy_direction
text.align_bottom : const string
text.align_center : const string
text.align_left : const string
text.align_right : const string
text.align_top : const string
text.format_bold : const text_format
text.format_italic : const text_format
text.format_none : const text_format
text.wrap_auto : const string
text.wrap_none : const string
xloc.bar_index : const string
xloc.bar_time : const string
yloc.abovebar : const string
yloc.belowbar : const string
yloc.price : const string`;
