# Лунная База — автономный статичный проект

Browser-based lunar rover prototype using plain HTML, CSS, JavaScript and native WebGL.

## Offline / static mode
- No backend server, account service, or game server is needed.
- No external CDN or library import is used. Rendering is implemented directly using WebGL.
- The app can be hosted as static files (GitHub Pages, static hosting) or opened locally. For browser security, some browsers may restrict pointer lock or scripts when opening via file://; if that happens, use any local static file server. This server only serves files and is not a game backend.
- No network connection is required after obtaining the project files.

## Controls
- W / S — drive forward / reverse
- A / D — steer
- Camera — fixed isometric angle, smoothly follows the rover; mouse does not rotate it
- E — mine a nearby mineral deposit
- Esc — pause/resume

## Stage 01 contents
- Third-person rover blockout, simple WebGL rendering, lunar ground, rocks and mineral pickups
- HUD for speed, energy and collected resources
- Main menu, pause and adjustable settings

## Roadmap
- Stage 02: modular base placement and interactions
- Stage 03: inventory, mining tools, crafting and progression
- Stage 04: local save system (IndexedDB), polish and QA

This is an early playable prototype; it does not yet include the complete base-building or persistence features.
## Stage 02 — base building
Branch: `stage/02-base-building`.
- Four modular build types: habitat, solar panel, resource storage, research lab.
- Select modules from the construction panel or number keys 1–4.
- Build ahead of the rover with the button; rotate with R or the rotate button.
- Prevents placements overlapping a neighboring occupied grid cell.
- Demolish the closest structure within 8 units.
- Base layout is stored locally in browser `localStorage` under `lunar-base-modules-v1`. No backend is used.


## Stage 03 — voxel diorama and fixed camera
Branch: `stage/03-voxel-diorama-fixed-camera`.
- Camera follows the rover smoothly with a constant world-space offset, angle and height.
- Mouse look and pointer lock are disabled.
- A starter outpost is present from the first launch: habitat, solar array, storage and lab.
- New base layout is initialized only when no previous local save exists; existing local constructions are preserved.

This is an incremental visual foundation pass, not yet a finished asset-quality recreation of the Sketchfab reference. Detailed voxel terrain, bespoke props, lighting and environmental set dressing remain planned work.


## Stage 04 — detailed voxel spaceport
Branch: `stage/04-detailed-voxel-spaceport`.
- Reworked the starter outpost with multi-part habitat, solar array, storage and laboratory details.
- Added a landing apron with perimeter lights, service tanks, connecting pipes, communication mast, service gantry, supply crates, walkway and rover parking bay.
- Replaced the infinite ground slab with a finite tiled voxel plateau and a stepped asteroid rim.
- Repositioned terrain rocks and mineral deposits onto the playable asteroid instead of scattering them through empty space.
- Existing saved base layouts remain intact; an empty or missing save initializes the starter outpost.
- Camera remains fixed-angle and follows the rover without mouse rotation.

Validation: JavaScript source passed a syntax parse check. The scene has not yet been visually tested in a browser; rendering quality and performance still need in-browser QA.


## Этап 05 — база в горе и блочное управление

- Стартовая база перенесена внутрь полости в горе: жилой модуль, солнечная панель, склад и лаборатория находятся в вырубленном ангаре.
- У входа в гору проложен блочный выезд к площадке лунохода у подножья.
- Размер базового вокселя мира уменьшен до 0.85 условной единицы; грунт и гора собраны из кубических блоков.
- Месторождения представлены группами из 1–4 отдельных минеральных блоков; добыча удаляет всю группу.
- Убрано освещение с бликами: материалы рендерятся ровным однотонным цветом без отражения.
- Луноход поворачивает на 90° по нажатию A/D или стрелок влево/вправо; W/S и стрелки вверх/вниз перемещают его шагами по сетке, как в «Змейке».
- Геометрия грунта и горы объединяется в цветовые батчи, чтобы не отправлять отдельный draw call для каждого вокселя.

Проверка этапа: синтаксис файла src/main.js проверен через new Function. Визуальный прогон в браузере не выполнялся; положение горы, проёма и базы требует проверки в реальном окне игры.


## Этап 06 — выезд лунохода из горного гаража

- Стартовая база сгруппирована внутри расширенной полости горы; для стартового набора создана новая версия локального сохранения, чтобы прежние координаты модулей не мешали гаражу.
- Луноход появляется в ангаре. После нажатия «Начать экспедицию» поднимается блочная створка, затем ровёр автоматически выезжает по рампе и останавливается у подножья горы.
- Во время выезда управление заблокировано; после остановки включаются обычное движение по сетке и повороты на 90°.
- Обновлены подсказки управления в HUD.
- Исправлен Pages workflow: запуск привязан к ветке `stage/06-mountain-garage-departure`, одновременные деплои сериализованы, активный деплой не отменяется новым push.

Проверка: JavaScript синтаксически проверен; визуальный прогон анимации и фактический запуск GitHub Pages ещё не подтверждены.


## Этап 07 — кратер и плавное управление луноходом

- Прежняя гора с подземным ангаром заменена широким неглубоким кратером с пологим дном и приподнятым неровным ободом.
- Гараж размещён на поверхности рядом с кратером; луноход начинает экспедицию внутри него, створка поднимается, после чего машина плавно выезжает на площадку.
- Базовые модули размещены на дне кратера и автоматически привязаны по высоте к рельефу.
- Движение переведено с шагов по сетке на непрерывное перемещение с плавным разгоном и торможением.
- A/D или стрелки задают поворот ровно на 90 градусов; корпус плавно доворачивается до нового направления, а движение продолжается по дуге во время анимации.
- Высота ровера, минералов, камней и построек учитывает поверхность кратера.

Проверка: исходник проверяется на синтаксис; визуальный прогон в браузере и проверка фактической геометрии в WebGL ещё требуются.


## Этап 08 — инвентарь и добыча минералов

- Добавлены три типа месторождений: железо, титан и кремний; тип различается по цвету в мире.
- Добыча клавишей E добавляет ресурс соответствующего типа в грузовой отсек.
- Вместимость грузового отсека — 120 кг; при нехватке места месторождение не исчезает.
- Бурение расходует 3 единицы энергии; при недостатке энергии добыча недоступна.
- Добавлена отдельная панель инвентаря с количеством каждого минерала и полосой заполнения контейнера.
- Общий показатель ресурсов в HUD теперь показывает суммарную массу собранных минералов.

Ограничение этапа: содержимое инвентаря пока живёт в памяти текущего запуска. Постоянное сохранение ресурсов и состояния экспедиции — следующий этап локального сохранения.
